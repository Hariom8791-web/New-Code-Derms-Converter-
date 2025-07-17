const express = require("express");
const userController = require("../controllers/userController");
const { checkauth } = require("../middleware/checkauth");

const routes = express.Router();

routes.post("/addUser", checkauth, userController.addUser);
routes.post("/login", userController.login);
routes.post("/resetPassword", checkauth, userController.resetPassword);
routes.get("/userList/:userRole", checkauth, userController.getUserList);
routes.post("/editUser", checkauth,userController.editUser);
routes.post("/deleteUser",checkauth, userController.deleteUser);
routes.post("/assignSite",checkauth, userController.assignSite);
routes.post("/checkUserUid",checkauth, userController.checkUserUid);
routes.post("/assignDeviceSensor",checkauth, userController.assignDeviceSensor);
routes.post("/getassignSensor",checkauth, userController.getassignSensor);
routes.get("/gettest", checkauth,userController.gettest);






module.exports = routes;