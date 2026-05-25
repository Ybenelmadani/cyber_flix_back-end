const express = require("express");
const router = express.Router();
const { getFreeProviders } = require("../controllers/freeProvidersController");

// GET /api/free-providers/:mediaType/:tmdbId
// For TV: ?season=1&episode=1
router.get("/:mediaType/:tmdbId", getFreeProviders);

module.exports = router;
