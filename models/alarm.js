const mongoose = require("mongoose");

const AlarmSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Types.ObjectId, required: false, ref: "Device" },
    SensorName: { type: Object, require: true },
    thresholdValue: { type: String, require: true },
    alarmValue: { type: String, require: true },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Alarm = mongoose.model("Alarm", AlarmSchema);

module.exports = Alarm;
