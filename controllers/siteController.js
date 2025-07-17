const Alarm = require("../models/alarm");
const Device = require("../models/device");
const Site = require("../models/site");
const User = require("../models/user");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
// =========================== Create Site ======================== //
exports.createSite = async (req, res, next) => {
  console.log("==== createSite function got hit () ====");
  const { siteName, uid, location, pincode, country, state } = req.body;

  if (!siteName || !uid || !location || !pincode || !country || !state) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    let site = await Site.create({
      siteName,
      uid,
      location,
      pincode,
      country,
      state,
    });
    if (site) {
      return res.status(200).json({ msg: "site created successfully" });
    }
  } catch (error) {
    console.log("error from createSite ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// =========================== Edit Site ======================== //
exports.editSite = async (req, res, next) => {
  console.log("==== editSite function got hit () ====");
  const { siteId, siteName, uid, location, pincode, country, state } = req.body;
  try {
    let site = await Site.findByIdAndUpdate(
      siteId,
      { siteName, uid, location, pincode, country, state },
      { new: true }
    );

    if (site) {
      return res
        .status(200)
        .json({ msg: "site edited successfully", data: site });
    }
  } catch (error) {
    console.log("error from editSite ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// =========================== Delete Site ======================== //
exports.deleteSite = async (req, res, next) => {
  console.log("==== deleteSite function got hit () ====");
  const { siteId } = req.body;
  if (!siteId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let site = await Site.findByIdAndDelete(siteId);
    await Device.deleteMany({ siteId: siteId });
    // console.log("DELETED SITE ===>", site);
    if (site) {
      return res.status(200).json({ msg: "site deleted successfully" });
    }
  } catch (error) {
    console.log("error from deleteSite ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ======================== Delete Site from user Profile =========================== //
exports.deleteSiteFromUser = async (req, res, next) => {
  const { userId, siteId } = req.body;
  if (!siteId || !userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }
  try {
    let resp = await Site.findByIdAndUpdate(siteId, {
      $pullAll: {
        userId: [userId],
      },
    });
    if (resp) {
      return res.status(200).json({ msg: "Site deleted from user Profile" });
    }
  } catch (error) {
    console.log("error from deleteSiteFromUser ==>", error.message);
  }
};

// =========================== Number of Site ============================= //
exports.numberOfSite = async (req, res, next) => {
  // let user = req.user
  // console.log("numberOfSite ===>", req.user.role)

  try {
    let RespSite;
    if (req.user.role === 0 || req.user.role === 1) {
      RespSite = await Site.find({}).lean();
    }
    if (req.user.role === 2) {
      RespSite = await Site.find({ userId: { $in: [req.user._id] } }).lean();
      for (let item of RespSite) {
        // console.log("==>", item._id.toString())
        let deviceCount = await Device.countDocuments({
          userId: { $in: [req.user._id] },
        });
        // console.log("device count ==>", deviceCount)
        item.deviceCount = deviceCount;
      }
      return res.status(200).json({ msg: RespSite });
    }
    for (let item of RespSite) {
      // console.log("==>", item._id.toString())
      let deviceCount = await Device.countDocuments({
        siteId: item._id.toString(),
      });
      // console.log("device count ==>", deviceCount)
      item.deviceCount = deviceCount;
    }
    // let deviceCount = await Device.find({})
    return res.status(200).json({ msg: RespSite });
  } catch (error) {
    console.log("error from numberOfSite =>", error.message);
  }
};

// ============================= Get site By UserId =============================== //
exports.getSiteByUserId = async (req, res, next) => {
  const { userId } = req.params;
  // console.log("== getSiteByUserId () ==")
  // console.table(req.params)
  try {
    let resp = await Site.find({ userId: { $in: [userId] } }).lean();
    for (let item of resp) {
      // console.log("==>", item._id.toString())
      // let deviceCount = await Device.countDocuments({siteId: item._id.toString()})
      let deviceCount = await Device.countDocuments({
        userId: { $in: [userId] },
      });
      // console.log("device count ==>", deviceCount)
      item.deviceCount = deviceCount;
    }
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("Error from getSiteByUserId ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================== check Site UID exists or not ============================== //
exports.checkSiteUid = async (req, res, next) => {
  const { uid } = req.body;
  try {
    let resp = await Site.findOne({ uid });
    // console.log("resp checkSiteUid ==>",  resp )
    if (!resp) {
      return res
        .status(200)
        .json({ msg: "This UID is available", status: true });
    }
    if (resp) {
      return res
        .status(200)
        .json({ msg: "This UID is not available", status: false });
    }
  } catch (error) {
    console.log("error from checkSiteUid", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= Search site by uid or Sitename ================================== //
exports.searchSite = async (req, res, next) => {
  const { searchQuery } = req.query;
  try {
    if (req.user.role === 2) {
      // console.log("searchSite role 2")
      RespSite = await Site.find({
        userId: { $in: [req.user._id] },
        $or: [
          { uid: { $regex: searchQuery, $options: "i" } },
          { siteName: { $regex: searchQuery, $options: "i" } },
        ],
      }).lean();

      return res.status(200).json({ msg: RespSite });
    }
    let sites = await Site.find({
      $or: [
        { uid: { $regex: searchQuery, $options: "i" } },
        { siteName: { $regex: searchQuery, $options: "i" } },
      ],
    });

    return res.status(200).json({ msg: sites });
  } catch (error) {
    console.log("error from searchSite ", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= GET ALL Resistance Site and Device Data ================================== //
exports.getAllSiteResistance = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "siteId",
        },
      },
      {
        $unwind: "$ResValues.DATASTREAMS",
      },
      {
        $addFields: {
          resistanceNumber: "$ResValues.DATASTREAMS.deviceNumber",
          resistanceValue: "$ResValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          resistanceNumber: 1,
          resistanceValue: 1,
          resSensorsThreshold: 1,
        },
      },
    ]);

    console.log(resp);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteResistance =>", error.message);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= GET ALL getAllSiteTemp and Device Data ================================== //
exports.getAllSiteTemp = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "siteId",
        },
      },
      {
        $unwind: "$HumValues.DATASTREAMS",
      },
      {
        $unwind: "$TempValues.DATASTREAMS",
      },
      {
        $addFields: {
          humKey: "$HumValues.DATASTREAMS.deviceNumber",
          humValue: "$HumValues.DATASTREAMS.value",
          tempKey: "$TempValues.DATASTREAMS.deviceNumber",
          tempValue: "$TempValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          humKey: 1,
          humValue: 1,
          tempKey: 1,
          tempValue: 1,
        },
      },
    ]);

    console.log(resp);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteTemp =>", error.message);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= GET ALL GN/NER Site and Device Data ================================== //
exports.getAllSiteGn = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "siteId",
        },
      },
      {
        $unwind: "$NerValues.DATASTREAMS",
      },
      {
        $addFields: {
          gnNumber: "$NerValues.DATASTREAMS.deviceNumber",
          gnValue: "$NerValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          gnNumber: 1,
          gnValue: 1,
          nerSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteGN =>", error.message);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= GET ALL spd Site and Device Data ================================== //
exports.getAllSiteSpd = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          // pipeline: [
          //   { "$project": { "siteName" : 1, "uid": 1 }}
          // ],
          as: "siteId",
        },
      },
      {
        $unwind: "$SpdValues.DATASTREAMS",
      },
      {
        $addFields: {
          spdNumber: "$SpdValues.DATASTREAMS.deviceNumber",
          spdValue: "$SpdValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          spdNumber: 1,
          spdValue: 1,
          spdSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteSpd =>", error.message);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================= GET ALL Phase/Vmr Site and Device Data ================================== //
exports.getAllSiteVmr = async (req, res, next) => {
  try {
    // let resp = await Device.find().populate('siteId')
    let resp = await Device.aggregate([
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          // pipeline: [
          //   { "$project": { "siteName" : 1, "uid": 1 }}
          // ],
          as: "siteId",
        },
      },
      {
        $unwind: "$VmrValues.DATASTREAMS",
      },
      {
        $addFields: {
          vmrNumber: "$VmrValues.DATASTREAMS.deviceNumber",
          vmrValue: "$VmrValues.DATASTREAMS.value",
        },
      },
      {
        $project: {
          _id: 1,
          deviceName: 1,
          nodeUid: 1,
          siteId: 1,
          vmrNumber: 1,
          vmrValue: 1,
          vmrSensorsThreshold: 1,
        },
      },
    ]);
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getAllSiteVmr =>", error.message);
    return res.status(500).json({ msg: error.message });
  }
};

/* Geth the All the Site or Device or Sensor names */
exports.getSiteOrDeviceOrSensor = async (req, res) => {
  try {
    const { siteId, deviceId } = req.query;
    let data;

    if (!siteId && !deviceId) {
      data = await Site.find({}).select("siteName uid");
    } else if (siteId && !deviceId) {
      data = await Device.find({ siteId }).select("deviceName");
    } else if (siteId && deviceId) {
      data = await Alarm.aggregate([
        {
          $match: {
            deviceId: ObjectId(deviceId),
          },
        },
        {
          $project: {
            firstWord: {
              $regexFind: {
                input: "$SensorName",
                regex: /^[a-zA-Z]+/,
              },
            },
          },
        },
        {
          $group: {
            _id: "$firstWord.match",
          },
        },
      ]);
    }

    return res.status(200).json({ data, success: true });
  } catch (err) {
    console.log("Error is ", err);
    return res.status(500).json({ msg: err.message, success: false });
  }
};
