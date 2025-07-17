const mongoose = require("mongoose");

const SiteSchema = new mongoose.Schema({
  userId: [{ type: mongoose.Types.ObjectId , required: false , ref: "User" }],
  siteName: { type: String, require: true },
  uid: {type: String, require: true},
  location: {type: String, require: false},
  pincode: {type: String, require: false},
  state: { type: String, require: false},
  country: {type: String, require: false},
}, 
{
    timestamps: true
}
);

const Site = mongoose.model("Site", SiteSchema);

module.exports = Site;
