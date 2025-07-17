const express = require("express");
const siteController = require("../controllers/siteController");
const { checkauth } = require("../middleware/checkauth");
const validate = require("../middleware/validationMethod");

const routes = express.Router();

routes.post("/createSite", siteController.createSite);
routes.post("/editSite", siteController.editSite);
routes.post("/deleteSite", siteController.deleteSite);
routes.get("/getnumberOfSite", checkauth, siteController.numberOfSite);
routes.get(
  "/getSiteByUserId/:userId",
  checkauth,
  siteController.getSiteByUserId
);
routes.post("/checkSiteUid", checkauth, siteController.checkSiteUid);
routes.post("/deleteSitefromuser", siteController.deleteSiteFromUser);
routes.get("/searchSite", checkauth, siteController.searchSite);
routes.get("/getAllSiteResistance", siteController.getAllSiteResistance);
routes.get("/getAllSiteTemp", siteController.getAllSiteTemp);
routes.get("/getAllSiteGn", siteController.getAllSiteGn);
routes.get("/getAllSiteSpd", siteController.getAllSiteSpd);
routes.get("/getAllSiteVmr", siteController.getAllSiteVmr);
routes.get(
  "/getSiteOrDeviceOrSensor",
  validate.getSiteOrDeviceOrSensorBody,
  siteController.getSiteOrDeviceOrSensor
);

module.exports = routes;
