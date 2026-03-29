const Review = require("../models/Review");
const ReviewReply = require("../models/ReviewReply");
const mongoose = require("mongoose");

const ALLOWED_MEDIA_TYPES = new Set(["movie", "tv"]);

const normalizeMediaType = (value) => String(value || "").trim().toLowerCase();
const normalizeItemId = (value) => String(value || "").trim();

const isValidMediaType = (value) => ALLOWED_MEDIA_TYPES.has(normalizeMediaType(value));

const buildSummary = (reviews = []) => {
  const ratingsCount = reviews.length;
  const commentsCount = reviews.filter((review) => String(review.comment || "").trim()).length;

  if (!ratingsCount) {
    return {
      averageRating: 0,
      ratingsCount: 0,
      commentsCount: 0,
    };
  }

  const ratingsTotal = reviews.reduce((acc, review) => acc + Number(review.rating || 0), 0);
  return {
    averageRating: Number((ratingsTotal / ratingsCount).toFixed(2)),
    ratingsCount,
    commentsCount,
  };
};

const normalizeObjectId = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const serializeReview = (reviewDoc, currentUserId = "") => {
  const review = typeof reviewDoc.toObject === "function" ? reviewDoc.toObject() : reviewDoc;
  const ownerId =
    review?.userId && typeof review.userId === "object" && review.userId._id
      ? String(review.userId._id)
      : String(review.userId || "");

  return {
    id: String(review._id),
    mediaType: review.mediaType,
    itemId: review.itemId,
    rating: Number(review.rating || 0),
    comment: review.comment || "",
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    editedAt: review.editedAt || null,
    user: {
      id: ownerId,
      name:
        review?.userId && typeof review.userId === "object" && review.userId.name
          ? review.userId.name
          : "User",
    },
    isOwner: Boolean(currentUserId && ownerId && currentUserId === ownerId),
  };
};

const serializeReply = (replyDoc, currentUserId = "") => {
  const reply = typeof replyDoc.toObject === "function" ? replyDoc.toObject() : replyDoc;
  const ownerId =
    reply?.userId && typeof reply.userId === "object" && reply.userId._id
      ? String(reply.userId._id)
      : String(reply.userId || "");

  return {
    id: String(reply._id),
    reviewId:
      reply?.reviewId && typeof reply.reviewId === "object" && reply.reviewId._id
        ? String(reply.reviewId._id)
        : String(reply.reviewId || ""),
    parentReplyId:
      reply?.parentReplyId && typeof reply.parentReplyId === "object" && reply.parentReplyId._id
        ? String(reply.parentReplyId._id)
        : reply.parentReplyId
        ? String(reply.parentReplyId)
        : null,
    mediaType: reply.mediaType,
    itemId: reply.itemId,
    message: reply.message || "",
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    editedAt: reply.editedAt || null,
    user: {
      id: ownerId,
      name:
        reply?.userId && typeof reply.userId === "object" && reply.userId.name
          ? reply.userId.name
          : "User",
    },
    isOwner: Boolean(currentUserId && ownerId && currentUserId === ownerId),
    children: [],
  };
};

const fetchReviewsForItem = async (mediaType, itemId) =>
  Review.find({ mediaType, itemId })
    .populate("userId", "name")
    .sort({ createdAt: -1 });

const fetchRepliesForItem = async (mediaType, itemId) =>
  ReviewReply.find({ mediaType, itemId })
    .populate("userId", "name")
    .sort({ createdAt: 1 });

const mapRepliesByReview = (replyDocs = [], currentUserId = "") => {
  const nodes = replyDocs.map((reply) => serializeReply(reply, currentUserId));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rootsByReview = new Map();

  nodes.forEach((node) => {
    const parentId = normalizeObjectId(node.parentReplyId);
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(node);
      return;
    }

    if (!rootsByReview.has(node.reviewId)) {
      rootsByReview.set(node.reviewId, []);
    }
    rootsByReview.get(node.reviewId).push(node);
  });

  return rootsByReview;
};

const buildReviewsPayload = async (mediaType, itemId, currentUserId = "") => {
  const [reviews, replies] = await Promise.all([
    fetchReviewsForItem(mediaType, itemId),
    fetchRepliesForItem(mediaType, itemId),
  ]);

  const summary = buildSummary(reviews);
  const repliesByReview = mapRepliesByReview(replies, currentUserId);
  const payload = reviews.map((review) => {
    const serialized = serializeReview(review, currentUserId);
    serialized.replies = repliesByReview.get(serialized.id) || [];
    return serialized;
  });

  const myReview = currentUserId
    ? payload.find((review) => review.user.id === currentUserId) || null
    : null;

  return {
    summary,
    reviews: payload,
    myReview,
  };
};

const getReviews = async (req, res) => {
  try {
    const mediaType = normalizeMediaType(req.params.mediaType);
    const itemId = normalizeItemId(req.params.itemId);
    const currentUserId = req.user?.id ? String(req.user.id) : "";

    if (!isValidMediaType(mediaType) || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType or itemId",
      });
    }

    const payload = await buildReviewsPayload(mediaType, itemId, currentUserId);

    return res.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const upsertReview = async (req, res) => {
  try {
    const mediaType = normalizeMediaType(req.params.mediaType);
    const itemId = normalizeItemId(req.params.itemId);
    const userId = req.user?.id ? String(req.user.id) : "";
    const ratingValue = Number(req.body?.rating);
    const normalizedRating = Number.isFinite(ratingValue) ? Math.round(ratingValue) : NaN;
    const comment = String(req.body?.comment || "").trim().slice(0, 800);

    if (!isValidMediaType(mediaType) || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType or itemId",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    await Review.findOneAndUpdate(
      {
        userId,
        mediaType,
        itemId,
      },
      {
        $set: {
          rating: normalizedRating,
          comment,
          editedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const payload = await buildReviewsPayload(mediaType, itemId, userId);

    return res.json({
      success: true,
      message: "Review saved",
      ...payload,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Review already exists for this user and title",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const mediaType = normalizeMediaType(req.params.mediaType);
    const itemId = normalizeItemId(req.params.itemId);
    const userId = req.user?.id ? String(req.user.id) : "";

    if (!isValidMediaType(mediaType) || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType or itemId",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const deleted = await Review.findOneAndDelete({
      userId,
      mediaType,
      itemId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await ReviewReply.deleteMany({ reviewId: deleted._id });
    const payload = await buildReviewsPayload(mediaType, itemId, userId);

    return res.json({
      success: true,
      message: "Review deleted",
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createReply = async (req, res) => {
  try {
    const mediaType = normalizeMediaType(req.params.mediaType);
    const itemId = normalizeItemId(req.params.itemId);
    const reviewId = normalizeObjectId(req.params.reviewId);
    const userId = req.user?.id ? String(req.user.id) : "";
    const message = String(req.body?.message || "").trim().slice(0, 800);
    const parentReplyId = normalizeObjectId(req.body?.parentReplyId);

    if (!isValidMediaType(mediaType) || !itemId || !reviewId) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType, itemId or reviewId",
      });
    }

    if (!isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reviewId",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const review = await Review.findOne({ _id: reviewId, mediaType, itemId }).select("_id");
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    let validatedParentReplyId = null;
    if (parentReplyId) {
      if (!isValidObjectId(parentReplyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parentReplyId",
        });
      }

      const parentReply = await ReviewReply.findOne({
        _id: parentReplyId,
        reviewId,
        mediaType,
        itemId,
      }).select("_id");

      if (!parentReply) {
        return res.status(404).json({
          success: false,
          message: "Parent reply not found",
        });
      }

      validatedParentReplyId = parentReply._id;
    }

    await ReviewReply.create({
      reviewId,
      parentReplyId: validatedParentReplyId,
      userId,
      mediaType,
      itemId,
      message,
      editedAt: null,
    });

    const payload = await buildReviewsPayload(mediaType, itemId, userId);
    return res.json({
      success: true,
      message: "Reply posted",
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteReply = async (req, res) => {
  try {
    const mediaType = normalizeMediaType(req.params.mediaType);
    const itemId = normalizeItemId(req.params.itemId);
    const reviewId = normalizeObjectId(req.params.reviewId);
    const replyId = normalizeObjectId(req.params.replyId);
    const userId = req.user?.id ? String(req.user.id) : "";

    if (!isValidMediaType(mediaType) || !itemId || !reviewId || !replyId) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType, itemId, reviewId or replyId",
      });
    }

    if (!isValidObjectId(reviewId) || !isValidObjectId(replyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reviewId or replyId",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const targetReply = await ReviewReply.findOne({
      _id: replyId,
      reviewId,
      mediaType,
      itemId,
    }).select("_id userId");

    if (!targetReply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    if (String(targetReply.userId) !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reply",
      });
    }

    const toDelete = [String(targetReply._id)];
    let cursor = 0;

    while (cursor < toDelete.length) {
      const batchIds = toDelete.slice(cursor, cursor + 50);
      cursor += 50;
      const children = await ReviewReply.find({
        parentReplyId: { $in: batchIds },
      }).select("_id");
      children.forEach((child) => {
        const childId = String(child._id);
        if (!toDelete.includes(childId)) {
          toDelete.push(childId);
        }
      });
    }

    await ReviewReply.deleteMany({
      _id: { $in: toDelete },
      reviewId,
      mediaType,
      itemId,
    });

    const payload = await buildReviewsPayload(mediaType, itemId, userId);
    return res.json({
      success: true,
      message: "Reply deleted",
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getReviews,
  upsertReview,
  deleteReview,
  createReply,
  deleteReply,
};
