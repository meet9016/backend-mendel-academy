const express = require('express');
const authRoute = require('./auth.route');
const categoryRoute = require('./category.route');
const questionRoute = require('./question.route');
const blogsRoute = require('./blogs.route');
const preRoute = require('./pathology/prerecorded.route');
const liveRoute = require('./pathology/liveCourses.route');
const upcommingprogramRoute = require('./pathology/upComingProgram.route');
const examListRoute = require('./examCategory.route');
const cartRoute = require('./cart.route');
const paymentRoute = require('./payment.route');
const faqRoute = require('./faq.route');
const contactusRoute = require('./contactUs.route');
const hyperSpecialistRoute = require('./pathology/hyperSpecialist.route');
const termsConditionsRoute = require('./termsConditions.route');
const questionsRoute = require('./questionBank/question.route');
const chapterRoute = require('./questionBank/chapter.route');
const topicRoute = require('./questionBank/topic.route');
const subjectRoute = require('./questionBank/subject.route');
const testAttemptRoute = require('./testAttempt.route');
const demoQuestionRoute = require('./demoQuestion.route');
const planRoute = require('./plan.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/question',
    route: questionRoute,
  },
  {
    path: '/blogs',
    route: blogsRoute,
  },
  {
    path: '/prerecorded',
    route: preRoute,
  },
  {
    path: '/livecourses',
    route: liveRoute,
  },
  {
    path: '/examlist',
    route: examListRoute,
  },
  {
    path: '/cart',
    route: cartRoute,
  },
  {
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/faq',
    route: faqRoute
  },
  {
    path: '/contactus',
    route: contactusRoute
  },
  {
    path: '/upcomming-program',
    route: upcommingprogramRoute
  },
  {
    path: '/hyperSpecialist',
    route: hyperSpecialistRoute
  },
  {
    path: '/terms-conditions',
    route: termsConditionsRoute
  },
  {
    path: '/subject',
    route: subjectRoute
  },
  {
    path: '/questions',
    route: questionsRoute
  },
  {
    path: '/chapter',
    route: chapterRoute
  },
  {
    path: '/topic',
    route: topicRoute
  },
  {
    path: '/test-attempt',
    route: testAttemptRoute
  },
  {
    path: '/demo-question',
    route: demoQuestionRoute
  },
  {
    path: '/plans',
    route: planRoute
  }
];


defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
