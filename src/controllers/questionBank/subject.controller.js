const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { Subject, Chapter, Topic, AcademicQuestion } = require('../../models');
const pick = require('../../utils/pick');

const createSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.create(req.body);
    res.status(httpStatus.CREATED).send(subject);
  }),
};

const getSubjects = {
  handler: catchAsync(async (req, res) => {
    const filter = pick(req.query, ['name']);
    if (filter.search) {
      filter.search = { $regex: filter.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const subjects = await Subject.find(filter, null, options);
    res.send(subjects);
  }),
};

const getSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    res.send(subject);
  }),
};

const updateSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findByIdAndUpdate(req.params.subjectId, req.body, { new: true });
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    res.send(subject);
  }),
};

const deleteSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    const chapters = await Chapter.find({ subject: req.params.subjectId });
    const chapterIds = chapters.map((chapter) => chapter._id);
    const topics = await Topic.find({ chapter: { $in: chapterIds } });
    const topicIds = topics.map((topic) => topic._id);
    await AcademicQuestion.deleteMany({ topic: { $in: topicIds } });
    await Topic.deleteMany({ chapter: { $in: chapterIds } });
    await Chapter.deleteMany({ subject: req.params.subjectId });
    await subject.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

/**
 * GET /subjects/qbank-tree
 *
 * Single API that returns the full tree:
 *   Subject → Chapters → Topics → questionCount
 *
 * Response shape:
 * {
 *   totalQuestions: 1200,
 *   subjects: [
 *     {
 *       id: "...",
 *       name: "Physics",
 *       questionCount: 400,
 *       chapters: [
 *         {
 *           id: "...",
 *           name: "Mechanics",
 *           questionCount: 120,
 *           topics: [
 *             { id: "...", name: "Newton's Laws", questionCount: 40 },
 *             ...
 *           ]
 *         },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * }
 *
 * Strategy: MongoDB aggregation pipeline
 *   1. Start from AcademicQuestion (has topic ref)
 *   2. $group by topic  → topicQuestionCount
 *   3. $lookup Topic    → get topic name + chapter ref
 *   4. $group by chapter → chapterQuestionCount + topics array
 *   5. $lookup Chapter  → get chapter name + subject ref
 *   6. $group by subject → subjectQuestionCount + chapters array
 *   7. $lookup Subject  → get subject name
 *   8. Also fetch subjects with 0 questions via a second query and merge
 */
const getQBankTree = {
  handler: catchAsync(async (req, res) => {
    // ── Step 1: Aggregation pipeline from AcademicQuestion upwards ──────────
    const pipeline = [
      // Group questions by topic
      {
        $group: {
          _id: '$topic',
          questionCount: { $sum: 1 },
        },
      },
      // Join Topic to get name + chapter ref
      {
        $lookup: {
          from: 'topics',
          localField: '_id',
          foreignField: '_id',
          as: 'topicDoc',
        },
      },
      { $unwind: { path: '$topicDoc', preserveNullAndEmptyArrays: false } },
      // Project topic fields
      {
        $project: {
          _id: 0,
          topicId: '$_id',
          topicName: '$topicDoc.name',
          chapterId: '$topicDoc.chapter',
          questionCount: 1,
        },
      },
      // Group by chapter → collect topics array + sum questionCount
      {
        $group: {
          _id: '$chapterId',
          questionCount: { $sum: '$questionCount' },
          topics: {
            $push: {
              id: '$topicId',
              name: '$topicName',
              questionCount: '$questionCount',
            },
          },
        },
      },
      // Join Chapter to get name + subject ref
      {
        $lookup: {
          from: 'chapters',
          localField: '_id',
          foreignField: '_id',
          as: 'chapterDoc',
        },
      },
      { $unwind: { path: '$chapterDoc', preserveNullAndEmptyArrays: false } },
      // Project chapter fields
      {
        $project: {
          _id: 0,
          chapterId: '$_id',
          chapterName: '$chapterDoc.name',
          subjectId: '$chapterDoc.subject',
          questionCount: 1,
          topics: 1,
        },
      },
      // Group by subject → collect chapters array + sum questionCount
      {
        $group: {
          _id: '$subjectId',
          questionCount: { $sum: '$questionCount' },
          chapters: {
            $push: {
              id: '$chapterId',
              name: '$chapterName',
              questionCount: '$questionCount',
              topics: '$topics',
            },
          },
        },
      },
      // Join Subject to get name
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subjectDoc',
        },
      },
      { $unwind: { path: '$subjectDoc', preserveNullAndEmptyArrays: false } },
      // Final shape
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: '$subjectDoc.name',
          questionCount: 1,
          chapters: 1,
        },
      },
      { $sort: { name: 1 } },
    ];

    const subjectsWithQuestions = await AcademicQuestion.aggregate(pipeline);

    // ── Step 2: Fetch ALL subjects + chapters + topics (including empty ones) ─
    const [allSubjects, allChapters, allTopics] = await Promise.all([
      Subject.find({}).lean(),
      Chapter.find({}).lean(),
      Topic.find({}).lean(),
    ]);

    // Build lookup maps for fast access
    const subjectMap = new Map();
    for (const s of allSubjects) {
      subjectMap.set(s._id.toString(), { id: s._id, name: s.name });
    }

    // Build a map of chapter → topics (with questionCount defaulting to 0)
    const topicsByChapter = new Map();
    for (const t of allTopics) {
      const chId = t.chapter.toString();
      if (!topicsByChapter.has(chId)) topicsByChapter.set(chId, []);
      topicsByChapter.get(chId).push({ id: t._id, name: t.name, questionCount: 0 });
    }

    // Build a map of subject → chapters (with questionCount defaulting to 0)
    const chaptersBySubject = new Map();
    for (const ch of allChapters) {
      const sId = ch.subject.toString();
      if (!chaptersBySubject.has(sId)) chaptersBySubject.set(sId, []);
      chaptersBySubject.get(sId).push({
        id: ch._id,
        name: ch.name,
        questionCount: 0,
        topics: topicsByChapter.get(ch._id.toString()) || [],
      });
    }

    // ── Step 3: Merge aggregation results into the full tree ─────────────────
    // Build a fast lookup from aggregation results
    const aggSubjectMap = new Map();
    for (const s of subjectsWithQuestions) {
      aggSubjectMap.set(s.id.toString(), s);
    }

    const aggChapterMap = new Map();
    for (const s of subjectsWithQuestions) {
      for (const ch of s.chapters) {
        aggChapterMap.set(ch.id.toString(), ch);
      }
    }

    const aggTopicMap = new Map();
    for (const s of subjectsWithQuestions) {
      for (const ch of s.chapters) {
        for (const t of ch.topics) {
          aggTopicMap.set(t.id.toString(), t);
        }
      }
    }

    // Build final subjects list (all subjects, filled with real counts where available)
    let totalQuestions = 0;

    const finalSubjects = allSubjects.map((s) => {
      const sId = s._id.toString();
      const aggSubject = aggSubjectMap.get(sId);
      const subjectQuestionCount = aggSubject ? aggSubject.questionCount : 0;
      totalQuestions += subjectQuestionCount;

      const chaptersForSubject = (chaptersBySubject.get(sId) || []).map((ch) => {
        const chId = ch.id.toString();
        const aggChapter = aggChapterMap.get(chId);
        const chapterQuestionCount = aggChapter ? aggChapter.questionCount : 0;

        const topicsForChapter = ch.topics.map((t) => {
          const tId = t.id.toString();
          const aggTopic = aggTopicMap.get(tId);
          return {
            id: tId,
            name: t.name,
            questionCount: aggTopic ? aggTopic.questionCount : 0,
          };
        });

        return {
          id: chId,
          name: ch.name,
          questionCount: chapterQuestionCount,
          topics: topicsForChapter,
        };
      });

      return {
        id: sId,
        name: s.name,
        questionCount: subjectQuestionCount,
        chapters: chaptersForSubject,
      };
    });

    res.send({ totalQuestions, subjects: finalSubjects });
  }),
};

module.exports = {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  getQBankTree,
};