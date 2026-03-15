const express = require("express");
const router = express.Router();

const {
  getStreamByTmdb,
  createStream,
  updateStream,
  deleteStream,
  listStreams,
} = require("../controllers/streamController");

const { authRequired, optionalAuth } = require("../middleware/auth");
const adminRequired = require("../middleware/admin");

// Lecture publique avec auth optionnelle pour filtrer premium/free
router.get("/:mediaType/:tmdbId", optionalAuth, getStreamByTmdb);

// Admin
router.get("/", authRequired, adminRequired, listStreams);
router.post("/", authRequired, adminRequired, createStream);
router.patch("/:id", authRequired, adminRequired, updateStream);
router.delete("/:id", authRequired, adminRequired, deleteStream);

module.exports = router;