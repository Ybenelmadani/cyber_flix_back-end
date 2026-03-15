const express = require("express");
const router = express.Router();
const { authRequired } = require("../middleware/auth");
const {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
} = require("../controllers/movieController");

router.post("/favorites", authRequired, addToFavorites);
router.get("/favorites", authRequired, getFavorites);
router.delete("/favorites/:movieId", authRequired, removeFromFavorites);

module.exports = router;
