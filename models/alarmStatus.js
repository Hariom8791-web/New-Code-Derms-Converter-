const mongoose = require("mongoose");

const AlarmStatusSchema = new mongoose.Schema(
  {
    status: { type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
);

const AlarmStatus = mongoose.model("AlarmStatus", AlarmStatusSchema);
module.exports = AlarmStatus;
