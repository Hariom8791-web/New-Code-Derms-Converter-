const mongoose = require("mongoose");

const DeviceMsgSchema = new mongoose.Schema({
    deviceId: { type: mongoose.Types.ObjectId, required: true, ref: "Device" },
    msg: {type: Object},       
    date: { type: String, required: true },
    time: {type: String, required: true},
    dateAndTime: {type: String},
    lastSavedTime: { type: Number, default: 0 },
}, 
{
  timestamps: true
}
);

const DeviceMsg = mongoose.model("DeviceMsg", DeviceMsgSchema);

module.exports = DeviceMsg;
