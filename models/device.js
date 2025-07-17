const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Types.ObjectId, required: true, ref: "Site" },
    deviceName: { type: String, require: true },
    userId: [{ type: mongoose.Types.ObjectId, required: false, ref: "User" }],
    nodeUid: { type: String, require: true, default: null }, // Device NodeID
    temp: { type: Number, require: true, default: 0 },
    humidity: { type: Number, require: true, default: 0 },
    vmrSensors: { type: Number, require: false, default: 0 }, // Number of Phase Sensor voltage manage
    resSensors: { type: Number, require: false, default: 0 }, // Number of Resistance Sensor
    spdSensors: { type: Number, require: false, default: 0 }, // Number of SPD Sensor for hight voltage
    nerSensors: { type: Number, require: false, default: 0 }, // Number of GN Sensor for ground and nutral voltage

    vmrSensorsThreshold: { type: Object, require: false, default: 0 }, // Phase Threshold  {r: 2, y: 2, b: 2, ry:2, yb:3, rb:4}
    resSensorsThreshold: { type: Number, require: false, default: 0 }, // Resistance Threshold
    spdSensorsThreshold: { type: Number, require: false, default: 0 }, // SPD Threshold
    nerSensorsThreshold: { type: Number, require: false, default: 0 }, // GN Threshold

    ResValues: Object, // to show latest values on the card table
    NerValues: Object,
    SpdValues: Object,
    VmrValues: Object,
    HumValues: Object,
    TempValues: Object,
  },
  {
    timestamps: true,
  }
);

const Device = mongoose.model("Device", DeviceSchema);

module.exports = Device;
