const joi = require("joi");

const dateFormat = joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const id = joi.string().regex(/^[0-9a-fA-F]{24}$/);

let page = {
  page: joi.number().min(1).required(),
  limit: joi.number().min(1).required(),
};

/* start end date in format order */
let seDate = {
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
};

exports.getAlarmGraphValueSchema = joi.object({
  ...seDate,
  deviceId: joi.required(),
  sensorName: joi.string().required(),
});

exports.getAllAlarmSchema = joi.object({
  deviceId: id.allow(null, ""),
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
  sensorName: joi.string().allow(null),
  search: joi.string().allow(null),
  sortBy: joi.string().required(),
  sortType: joi.number().valid(1, -1).required(),
  ...page,
});

exports.getAllAlarmDataForDownloadSchema = joi.object({
  deviceId: joi.array().items(id).required(),
  startDate: dateFormat.required(),
  endDate: dateFormat.required(),
  sensorName: joi.string().allow(null),
});

exports.getSiteOrDeviceOrSensorSchema = joi.object({
  deviceId: id.allow(null),
  siteId: id.allow(null),
});
