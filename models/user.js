const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');


const UserSchema = new mongoose.Schema({
  password: { type: String, require: true, select: false },
  fullName: {type: String, require: true},
  uid: {type: String, require: true},
  role: { type: Number, default: 2 },   // technician = 1, user = 2
  // siteId: [{ type: mongoose.Types.ObjectId , required: false , ref: "Site" }],  // assign Site
  // deviceId: [{ type: mongoose.Types.ObjectId , required: false , ref: "Device" }],  // assign Device

  deviceSensors: [{type: Object, require: false}],

},
{
  timestamps: true
}
);

UserSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    let hash = crypto.createHash('sha1');
    let data = hash.update(user.password, 'utf-8');
    let gen_hash= data.digest('hex');
    user.password = gen_hash
  }

  next();
});

UserSchema.methods.matchPasswords = async function (password) {
  let hash = crypto.createHash('sha1');
  let data = hash.update(password, 'utf-8');
  let gen_hash= data.digest('hex');
  return this.password === gen_hash 
};

UserSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET
  //   , {
  //   expiresIn: process.env.JWT_EXPIRE,
  // }
  );
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
