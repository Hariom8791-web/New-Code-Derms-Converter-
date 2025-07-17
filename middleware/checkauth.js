const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.checkauth = async (req, res, next) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(403).json({ msg: "Token not found" });
    }

    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decode.id);
      // console.log("User ID from MIddleware ==========> ", data,"user.name=>>>>>>>",data.name);
      if (!user) {
        return res.status(403).json({ msg: "Invalid Token" });
      }

    req.user = user;

    next();
    } catch (error) {
      res.status(401).json({
        status: false,
        error: error.message,
      });
    }
  };
