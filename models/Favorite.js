const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    movieId: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      default: "movie",
    },
    rawFavoriteKey: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    poster: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ userId: 1, rawFavoriteKey: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
