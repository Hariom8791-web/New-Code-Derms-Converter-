const { dateGroup } = require("../helperFunction/dateGroup");
const Alarm = require("../models/alarm");
const moment = require("moment");
const ObjectId = require("mongodb").ObjectId;
const AlarmStatus = require("../models/alarmStatus");
const DeviceMsg = require("../models/deviceMsg");
const Device = require("../models/device");

exports.getAlarmGraphValue = async (req, res) => {
  try {
    const { startDate, endDate, deviceId, sensorName } = req.query;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
      deviceId,
    };
    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    let data = await Alarm.find(query, {
      createdAt: 1,
      alarmValue: 1,
    });

    const group = dateGroup(startDate, endDate, "createdAt");
    group.alarmValue = { $max: "$msg.DATASTREAMS.value" };

    let isAlarm = true;
    // if (data?.length <= 0) {
    //   isAlarm = false;

    //   data = await DeviceMsg.aggregate([
    //     {
    //       $unwind: "$msg.DATASTREAMS",
    //     },
    //     // {
    //     //   $unwind: "$msg.DATASTREAMS.value",
    //     // },
    //     {
    //       $match: {
    //         deviceId: ObjectId(deviceId),
    //         "msg.DEVICE_TYPE": sensorName,
    //         createdAt: query.createdAt,
    //       },
    //     },
    //     {
    //       $group: group,
    //     },
    //     // {
    //     //   $project: {
    //     //     createdAt: "$_id",
    //     //     alarmValue: "$alarmValue.value",
    //     //   },
    //     // },
    //   ]);
    // }

    return res.status(200).json({ data, success: true, isAlarm });
  } catch (err) {
    console.log("error from getAllAlarm", err);
    return res.status(500).json({ msg: err.message });
  }
};

/* It is used to cancelled the alarm sound */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (status != false && status != true) {
      return res
        .status(400)
        .json({ msg: "Status must be 'true' or 'false'", success: false });
    }

    const alarmStatus = await AlarmStatus.findOne({});

    if (alarmStatus) {
      alarmStatus.status = status;
      await alarmStatus.save();
    } else {
      /* First time data not found then it created */
      await AlarmStatus.create({ status: false });
    }

    return res.status(200).json({ msg: "Status Updated", success: false });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

/* It is used to cancelled the alarm sound */
exports.getAlarmStatus = async (req, res) => {
  try {
    const data = await AlarmStatus.findOne({}).select("-_id status").lean();
    // const count = await Alarm.countDocuments({ isRead: true });
    const deviceData = await Device.find();
    // console.log("Check deviceData", JSON.stringify(deviceData));
    console.log(data);
    data.sound = false;
    if (data?.status) {
      for (let item of deviceData) {
        if (
          item?.vmrSensors <= item?.VmrValues?.DATASTREAMS?.[0]?.value ||
          item?.resSensorsThreshold <=
            item?.ResValues?.DATASTREAMS?.[0]?.value ||
          item?.spdSensorsThreshold <=
            item?.SpdValues?.DATASTREAMS?.[0]?.value ||
          item?.nerSensorsThreshold <= item?.NerValues?.DATASTREAMS?.[0]?.value
        ) {
          data.sound = true;
        }
      }
    }

    return res.status(200).json({ data, success: false });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

exports.getAlarmData = async (req, res, next) => {
  try {
    const {
      deviceId,
      page,
      limit,
      startDate,
      endDate,
      sensorName,
      search,
      sortBy,
      sortType,
    } = req.query;
    let skip = (page - 1) * limit;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
    };

    if (search) {
      query.$or = [
        { "device.deviceName": { $regex: search, $options: "i" } },
        { "device.nodeUid": { $regex: search, $options: "i" } },
        { "site.siteName": { $regex: search, $options: "i" } },
        { "site.uid": { $regex: search, $options: "i" } },
      ];
    }
    console.log({ deviceId });

    if (deviceId) {
      query = {
        deviceId: ObjectId(deviceId),
      };
    }

    // if (req.user.role === 2) {
    // }

    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    let arrQuery = [
      {
        $lookup: {
          from: "devices",
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $unwind: "$device",
      },
      {
        $lookup: {
          from: "sites",
          localField: "device.siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      {
        $unwind: "$site",
      },
    ];

    let data = await Alarm.aggregate([
      ...arrQuery,
      {
        $match: query,
      },
      {
        $sort: { [sortBy]: sortType },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          deviceId: {
            _id: "$device._id",
            siteId: {
              _id: "$site._id",
              siteName: "$site.siteName",
              uid: "$site.uid",
            },
            deviceName: "$device.deviceName",
            nodeUid: "$device.nodeUid",
          },
          SensorName: 1,
          thresholdValue: 1,
          alarmValue: 1,
          createdAt: 1,
        },
      },
    ]);
    let length = await Alarm.aggregate([
      ...arrQuery,
      {
        $project: {
          _id: 1,
        },
      },
    ]);
    length = length?.length;
    await Alarm.updateMany({ isRead: true }, { $set: { isRead: false } });
    // let alarm = await Alarm.find(query)
    //   .populate([
    //     {
    //       path: "deviceId",
    //       populate: {
    //         path: "siteId",
    //         select: { siteName: 1, uid: 1 },
    //       },
    //       select: "deviceName nodeUid",
    //     },
    //   ])
    //   .sort({ _id: -1 })
    //   .skip(skip)
    //   .limit(limit);

    // let length = await Alarm.countDocuments(query);

    return res.status(200).json({ lengthData: length, data, status: true });
  } catch (error) {
    console.log("error from getAllAlarm", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.getAllAlarmDataForDownload = async (req, res) => {
  try {
    const { deviceId, startDate, endDate, sensorName } = req.query;
    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(moment(endDate).add(1, "days").format("YYYY-MM-DD")),
      },
    };

    if (req.user.role === 2) {
      query = {
        deviceId: { $in: deviceId },
      };
    }
    if (sensorName) {
      if (sensorName == "PH") {
        query.SensorName = { $regex: /^[P][H]/, $options: "m" };
      } else if (sensorName == "RES") {
        query.SensorName = { $regex: /^[R]/, $options: "m" };
      } else {
        query.SensorName = { $regex: sensorName, $options: "m" };
      }
    }

    let data = await Alarm.find(query)
      .populate([
        {
          path: "deviceId",
          populate: {
            path: "siteId",
            select: { siteName: 1, uid: 1 },
          },
          select: "deviceName nodeUid",
        },
      ])
      .sort({ _id: -1 });

    return res.status(200).json({ data, status: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};

// ============================ GET ALL ALARMS ================================== //
exports.getAllAlarm = async (req, res, next) => {
  console.log("==== get All Alarm function got hit ====");
  const { deviceId, page, limit } = req.body;

  if (!deviceId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  let pages = Number(page) || 1;
  let limits = Number(limit) || 8;

  let skip = (pages - 1) * limits;

  let length;

  try {
    let alarm;
    if (req.user.role === 2) {
      alarm = await Alarm.find({
        deviceId: { $in: deviceId },
      })
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ])
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);
      length = await Alarm.countDocuments({
        deviceId: { $in: deviceId },
      });
    } else {
      alarm = await Alarm.find({})
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ])
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);

      length = await Alarm.countDocuments({});
    }
    return res
      .status(200)
      .json({ msg: alarm, status: true, lengthData: length });
  } catch (error) {
    console.log("error from getAllAlarm", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================ delete ALARMS by ID ================================== //
exports.deleteAlarm = async (req, res, next) => {
  console.log("==== deleteAlarm function got hit ====");
  const { alarmId } = req.body;

  if (!alarmId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    await Alarm.findByIdAndDelete(alarmId);
    return res.status(200).json({ msg: "Alarm deleted" });
  } catch (error) {
    console.log("Error from deleteAlarm", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================ Filter Alarm based on sensor ============================ //
exports.filterAlarm = async (req, res, next) => {
  const { sensorName, deviceId, page, limit } = req.query;

  let pages = Number(page) || 1;
  let limits = Number(limit) || 8;

  let skip = (pages - 1) * limits;

  let length;

  try {
    if (deviceId) {
      let filteredAlarm;
      if (sensorName === "PH") {
        filteredAlarm = await Alarm.find({
          deviceId,
          SensorName: { $regex: /^[P][H]/, $options: "m" },
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limits)
          .populate([
            {
              path: "deviceId",
              populate: {
                path: "siteId",
                select: { siteName: 1, uid: 1 },
              },
              select: "deviceName nodeUid",
            },
          ]);
        length = await Alarm.countDocuments({
          deviceId,
          SensorName: { $regex: /^[P][H]/, $options: "m" },
        });
        return res
          .status(200)
          .json({ msg: filteredAlarm, lengthData: Math.ceil(length / limits) });
      }

      if (sensorName === "RES") {
        filteredAlarm = await Alarm.find({
          deviceId,
          SensorName: { $regex: /^[R]/, $options: "m" },
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limits)
          .populate([
            {
              path: "deviceId",
              populate: {
                path: "siteId",
                select: { siteName: 1, uid: 1 },
              },
              select: "deviceName nodeUid",
            },
          ]);
        length = await Alarm.countDocuments({
          deviceId,
          SensorName: { $regex: /^[R]/, $options: "m" },
        });
        return res
          .status(200)
          .json({ msg: filteredAlarm, lengthData: Math.ceil(length / limits) });
      }
      filteredAlarm = await Alarm.find({
        deviceId,
        SensorName: { $regex: sensorName, $options: "i" },
      })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits)
        .populate([
          {
            path: "deviceId",
            populate: {
              path: "siteId",
              select: { siteName: 1, uid: 1 },
            },
            select: "deviceName nodeUid",
          },
        ]);
      length = await Alarm.countDocuments({
        deviceId,
        SensorName: { $regex: sensorName, $options: "i" },
      });
      return res
        .status(200)
        .json({ msg: filteredAlarm, lengthData: Math.ceil(length / limits) });
    }
  } catch (error) {
    console.log("error from filterAlarm ", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.getNotificationCount = async (req, res) => {
  try {
    const count = await Alarm.countDocuments({ isRead: true });
    return res.status(200).json({ count, success: true });
  } catch (err) {
    console.log("error in notification", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};
