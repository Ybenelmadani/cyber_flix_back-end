const Stream = require("../models/Stream");

const filterSourcesForUser = (sources = [], user = null) => {
  const isPremiumUser = user?.plan === "premium" || user?.role === "admin";

  return sources.filter((source) => {
    if (!source.isPremium) return true;
    return isPremiumUser;
  });
};

const buildStreamQuery = ({ mediaType, tmdbId, seasonNumber, episodeNumber }) => {
  const query = {
    mediaType,
    tmdbId: String(tmdbId),
  };

  if (mediaType === "movie") {
    query.seasonNumber = null;
    query.episodeNumber = null;
  }

  if (mediaType === "tv") {
    query.seasonNumber =
      seasonNumber !== undefined && seasonNumber !== null && seasonNumber !== ""
        ? Number(seasonNumber)
        : null;

    query.episodeNumber =
      episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== ""
        ? Number(episodeNumber)
        : null;
  }

  return query;
};

exports.getStreamByTmdb = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const { seasonNumber, episodeNumber } = req.query;

    if (!["movie", "tv"].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid media type",
      });
    }

    const query = buildStreamQuery({
      mediaType,
      tmdbId,
      seasonNumber,
      episodeNumber,
    });

    const stream = await Stream.findOne(query).lean();

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "No stream source found",
      });
    }

    const filteredSources = filterSourcesForUser(stream.sources, req.user);

    if (!filteredSources.length) {
      return res.status(403).json({
        success: false,
        message: "This content requires a premium account",
      });
    }

    return res.json({
      success: true,
      stream: {
        ...stream,
        sources: filteredSources,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stream",
    });
  }
};

exports.createStream = async (req, res) => {
  try {
    const {
      tmdbId,
      mediaType,
      seasonNumber = null,
      episodeNumber = null,
      title,
      poster = "",
      sources = [],
    } = req.body;

    if (!tmdbId || !mediaType || !title) {
      return res.status(400).json({
        success: false,
        message: "tmdbId, mediaType and title are required",
      });
    }

    if (!["movie", "tv"].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mediaType",
      });
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one source is required",
      });
    }

    const payload = {
      tmdbId: String(tmdbId),
      mediaType,
      seasonNumber: mediaType === "tv" ? Number(seasonNumber) : null,
      episodeNumber: mediaType === "tv" ? Number(episodeNumber) : null,
      title,
      poster,
      sources,
    };

    const stream = await Stream.create(payload);

    return res.status(201).json({
      success: true,
      message: "Stream created successfully",
      stream,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A stream for this media already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create stream",
    });
  }
};

exports.updateStream = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      title,
      poster,
      sources,
    } = req.body;

    const stream = await Stream.findById(id);

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Stream not found",
      });
    }

    if (tmdbId !== undefined) stream.tmdbId = String(tmdbId);
    if (mediaType !== undefined) stream.mediaType = mediaType;
    if (title !== undefined) stream.title = title;
    if (poster !== undefined) stream.poster = poster;

    if (stream.mediaType === "movie") {
      stream.seasonNumber = null;
      stream.episodeNumber = null;
    } else {
      if (seasonNumber !== undefined) stream.seasonNumber = Number(seasonNumber);
      if (episodeNumber !== undefined) stream.episodeNumber = Number(episodeNumber);
    }

    if (sources !== undefined) {
      if (!Array.isArray(sources) || sources.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one source is required",
        });
      }
      stream.sources = sources;
    }

    await stream.save();

    return res.json({
      success: true,
      message: "Stream updated successfully",
      stream,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another stream with same media already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update stream",
    });
  }
};

exports.deleteStream = async (req, res) => {
  try {
    const { id } = req.params;

    const stream = await Stream.findByIdAndDelete(id);

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Stream not found",
      });
    }

    return res.json({
      success: true,
      message: "Stream deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete stream",
    });
  }
};

exports.listStreams = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.query;

    const query = {};

    if (mediaType) query.mediaType = mediaType;
    if (tmdbId) query.tmdbId = String(tmdbId);

    const streams = await Stream.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: streams.length,
      streams,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list streams",
    });
  }
};