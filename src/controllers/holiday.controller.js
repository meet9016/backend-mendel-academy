const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Holiday } = require('../models');


const createHoliday = {
  validation: {
    body: Joi.object().keys({
      name: Joi.string().trim().required(),
      date: Joi.date().required(),
      description: Joi.string().allow('')
    }),
  },
  handler: async (req, res) => {

    const { name } = req.body;

    const holidayExist = await Holiday.findOne({ name });

    if (holidayExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Holiday already exist');
    }

    const holiday = await Holiday.create(req.body);

    res.status(httpStatus.CREATED).send(holiday);
  }
}


const getAllHoliday = {
  handler: async (req, res) => {
    const holidays = await Holiday.find();
    res.send(holidays);
  }
}

const updateHoliday = {
  validation: {
    body: Joi.object().keys({
      name: Joi.string().trim().required(),
      date: Joi.date().required(),
      description: Joi.string().allow('')
    }),
  },
  handler: async (req, res) => {

    const { _id } = req.params;

    const holidayExist = await Holiday.findOne({ _id });

    if (!holidayExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Holiday not exist');
    }

    if (req.body?.name) {
      const holidayExist = await Holiday.findOne({ name: req.body.name, _id: { $ne: _id } });
      if (holidayExist) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Holiday already exist');
      }
    }

    const holiday = await Holiday.findByIdAndUpdate(_id, req.body, { new: true });

    res.send(holiday);
  }

}


const deleteHoliday = {
  handler: async (req, res) => {
    const { _id } = req.params;

    const holidayExist = await Holiday.findOne({ _id });

    if (!holidayExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Holiday not exist');
    }

    await Holiday.findByIdAndDelete(_id);

    res.send({ message: 'Holiday deleted successfully' });
  }
}

module.exports = {
  createHoliday,
  getAllHoliday,
  updateHoliday,
  deleteHoliday
};