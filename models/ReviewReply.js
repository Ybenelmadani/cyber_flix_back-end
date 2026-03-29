const mongoose = require("mongoose");

const reviewReplySchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReviewReply",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      required: true,
      index: true,
    },
    itemId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reviewReplySchema.index({ reviewId: 1, createdAt: 1 });
reviewReplySchema.index({ mediaType: 1, itemId: 1, createdAt: 1 });

module.exports = mongoose.model("ReviewReply", reviewReplySchema);
