const mongoose = require("mongoose");

const streamSourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    quality: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["mp4", "hls"],
      default: "hls",
    },
    language: {
      type: String,
      default: "original",
      trim: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const streamSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      required: true,
      index: true,
    },
    seasonNumber: {
      type: Number,
      default: null,
    },
    episodeNumber: {
      type: Number,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    poster: {
      type: String,
      default: "",
      trim: true,
    },
    sources: {
      type: [streamSourceSchema],
      default: [],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one stream source is required",
      },
    },
  },
  { timestamps: true }
);

streamSchema.index(
  { tmdbId: 1, mediaType: 1, seasonNumber: 1, episodeNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Stream", streamSchema);