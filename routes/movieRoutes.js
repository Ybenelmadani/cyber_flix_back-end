const express = require("express");
const router = express.Router();
const { authRequired, optionalAuth } = require("../middleware/auth");
const {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
} = require("../controllers/movieController");
const {
  getReviews,
  upsertReview,
  deleteReview,
  createReply,
  deleteReply,
} = require("../controllers/reviewController");

router.post("/favorites", authRequired, addToFavorites);
router.get("/favorites", authRequired, getFavorites);
router.delete("/favorites/:movieId", authRequired, removeFromFavorites);
router.get("/:mediaType/:itemId/reviews", optionalAuth, getReviews);
router.put("/:mediaType/:itemId/reviews", authRequired, upsertReview);
router.delete("/:mediaType/:itemId/reviews", authRequired, deleteReview);
router.post("/:mediaType/:itemId/reviews/:reviewId/replies", authRequired, createReply);
router.delete(
  "/:mediaType/:itemId/reviews/:reviewId/replies/:replyId",
  authRequired,
  deleteReply
);

module.exports = router;
