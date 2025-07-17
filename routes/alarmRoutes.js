const express = require("express");
const alarmController = require("../controllers/alarmController");
const { checkauth } = require("../middleware/checkauth");
const validate = require("../middleware/validationMethod");
const routes = express.Router();

routes.post("/getAllAlarm", checkauth, alarmController.getAllAlarm);

routes.get(
  "/getAlarmData",
  checkauth,
  validate.getAllAlarmBody,
  alarmController.getAlarmData
);

routes.get(
  "/getAlarmGraphValue",
  checkauth,
  validate.getAlarmGraphValueBody,
  alarmController.getAlarmGraphValue
);

routes.get(
  "/getAllAlarmDataForDownload",
  checkauth,
  validate.getAllAlarmDataForDownloadBody,
  alarmController.getAllAlarmDataForDownload
);

routes.post("/deleteAlarm", checkauth, alarmController.deleteAlarm);
routes.get("/filteredAlarm", checkauth, alarmController.filterAlarm);
routes.post("/updateStatus", checkauth, alarmController.updateStatus);
routes.get("/getAlarmStatus", checkauth, alarmController.getAlarmStatus);
routes.get(
  "/getNotificationCount",
  checkauth,
  alarmController.getNotificationCount
);

module.exports = routes;
