const express = require("express");
const router = express.Router();

const {
  getStreamByTmdb,
  getSignedPlayback,
  createStream,
  updateStream,
  deleteStream,
  listStreams,
} = require("../controllers/streamController");

const { authRequired, optionalAuth } = require("../middleware/auth");
const adminRequired = require("../middleware/admin");

router.get("/:mediaType/:tmdbId/play", optionalAuth, getSignedPlayback);
router.get("/:mediaType/:tmdbId", optionalAuth, getStreamByTmdb);

router.get("/", authRequired, adminRequired, listStreams);
router.post("/", authRequired, adminRequired, createStream);
router.patch("/:id", authRequired, adminRequired, updateStream);
router.delete("/:id", authRequired, adminRequired, deleteStream);

module.exports = router;