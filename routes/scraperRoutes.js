const express = require("express");
const router = express.Router();
const scraperController = require("../controllers/scraperController");

router.get("/links", scraperController.getLinks);

module.exports = router;
