const express = require("express");
const deviceController = require("../controllers/deviceController");
const { checkauth } = require("../middleware/checkauth");

const routes = express.Router();

routes.post("/createDevice", deviceController.createDevice);
routes.post("/editDevice", deviceController.editDevice);
routes.post("/deleteDevice", deviceController.deleteDevice);
routes.post("/latestData", deviceController.latestdevicedata);
routes.post("/latestDatabyDate", deviceController.latestdevicedataBydate);
routes.get("/getdeviceListbysiteId/:siteId", checkauth ,deviceController.getdeviceList);
routes.post("/getdeviceListbysiteIdanduserId", checkauth , deviceController.getdeviceListByuserId);
routes.get("/downloadcsv", deviceController.downloadcsv);
routes.post("/generateReport", deviceController.getCsv);
routes.get("/getDeviceById/:deviceId", deviceController.getDeviceById);
routes.get("/getDeviceDataById/:deviceId", deviceController.getDeviceDataById);
routes.post("/checkDeviceUid", deviceController.checkDeviceUid);
routes.post("/deleteDevicefromuser", deviceController.deleteDeviceFromUser);
routes.get("/getdevicebyuserId/:userId", deviceController.getDeviceByuserId)

// ============ Reboot Device ========= //
// GET /api/device/reboot
// GET /api/device/shutdown
routes.get("/reboot", deviceController.deviceReboot)
// // ============ ShutDown Device =========== //
routes.get("/shutdown", deviceController.deviceShutdown)


module.exports = routes;