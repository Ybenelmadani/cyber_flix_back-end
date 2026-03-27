const Stream = require("../models/Stream");
const { signStreamPath } = require("../utils/streamSigning");

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
      seasonNumber !== undefined &&
      seasonNumber !== null &&
      seasonNumber !== ""
        ? Number(seasonNumber)
        : null;

    query.episodeNumber =
      episodeNumber !== undefined &&
      episodeNumber !== null &&
      episodeNumber !== ""
        ? Number(episodeNumber)
        : null;
  }

  return query;
};

const sanitizeSource = (source, index) => ({
  id: String(index),
  name:
    source.name ||
    `${source.quality || "Server"}${source.language ? ` - ${source.language}` : ""}`,
  quality: source.quality || "auto",
  language: source.language || "original",
  type:
    source.type ||
    (String(source.url || "").includes(".m3u8") ? "hls" : "mp4"),
  provider: source.provider || "custom",
  isPremium: Boolean(source.isPremium),
});

const validateSources = (sources = []) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "At least one source is required";
  }

  const invalidSource = sources.find((source) => {
    if (!source) return true;
    if (
      !String(source.playbackId || "").trim() &&
      !String(source.url || "").trim()
    ) {
      return true;
    }
    return false;
  });

  if (invalidSource) {
    return "Each source must include a playbackId or direct url";
  }

  return null;
};

const validateMediaPayload = ({
  mediaType,
  seasonNumber,
  episodeNumber,
}) => {
  if (!["movie", "tv"].includes(mediaType)) {
    return "Invalid mediaType";
  }

  if (
    mediaType === "tv" &&
    (seasonNumber === null ||
      seasonNumber === undefined ||
      seasonNumber === "" ||
      episodeNumber === null ||
      episodeNumber === undefined ||
      episodeNumber === "")
  ) {
    return "seasonNumber and episodeNumber are required for tv streams";
  }

  return null;
};

const signCustomUrl = ({ playbackId, path = "" }) => {
  const normalizedPath = path || `/videos/${playbackId}/master.m3u8`;
  return signStreamPath(normalizedPath);
};

const buildPlaybackUrl = (source) => {
  const directUrl = String(source?.url || "").trim();
  if (directUrl) {
    return directUrl;
  }

  const provider =
    source?.provider || (String(source?.playbackId || "").trim() ? "custom" : "");

  if (!source || !provider) {
    throw new Error("Invalid stream source");
  }

  if (provider === "custom") {
    return signCustomUrl({
      playbackId: source.playbackId,
      path: source.path,
    });
  }

  if (provider === "cloudflare") {
    const domain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
    if (!domain) {
      throw new Error("CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN missing");
    }

    return `https://${domain}/${source.playbackId}/manifest/video.m3u8`;
  }

  if (provider === "mux") {
    return `https://stream.mux.com/${source.playbackId}.m3u8`;
  }

  throw new Error("Unsupported stream provider");
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
        sources: filteredSources.map(sanitizeSource),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stream",
    });
  }
};

exports.getSignedPlayback = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const { seasonNumber, episodeNumber, source = "0" } = req.query;

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

    const requestedIndex = Number(source);
    const resolvedIndex =
      Number.isInteger(requestedIndex) && requestedIndex >= 0
        ? requestedIndex
        : 0;

    const selectedSource = filteredSources[resolvedIndex] || filteredSources[0];
    const finalIndex = filteredSources[resolvedIndex] ? resolvedIndex : 0;

    const playbackUrl = buildPlaybackUrl(selectedSource);

    return res.json({
      success: true,
      playback: {
        id: String(finalIndex),
        name:
          selectedSource.name ||
          `${selectedSource.quality || "Server"}${
            selectedSource.language ? ` - ${selectedSource.language}` : ""
          }`,
        url: playbackUrl,
        type:
          selectedSource.type ||
          (String(playbackUrl).includes(".m3u8") ? "hls" : "mp4"),
        quality: selectedSource.quality || "auto",
        language: selectedSource.language || "original",
        isPremium: Boolean(selectedSource.isPremium),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate playback url",
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

    const mediaValidationError = validateMediaPayload({
      mediaType,
      seasonNumber,
      episodeNumber,
    });

    if (mediaValidationError) {
      return res.status(400).json({
        success: false,
        message: mediaValidationError,
      });
    }

    const sourcesValidationError = validateSources(sources);

    if (sourcesValidationError) {
      return res.status(400).json({
        success: false,
        message: sourcesValidationError,
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

    const nextMediaType = mediaType !== undefined ? mediaType : stream.mediaType;
    const nextSeasonNumber =
      seasonNumber !== undefined ? seasonNumber : stream.seasonNumber;
    const nextEpisodeNumber =
      episodeNumber !== undefined ? episodeNumber : stream.episodeNumber;

    const mediaValidationError = validateMediaPayload({
      mediaType: nextMediaType,
      seasonNumber: nextSeasonNumber,
      episodeNumber: nextEpisodeNumber,
    });

    if (mediaValidationError) {
      return res.status(400).json({
        success: false,
        message: mediaValidationError,
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
      if (seasonNumber !== undefined) {
        stream.seasonNumber = Number(seasonNumber);
      }
      if (episodeNumber !== undefined) {
        stream.episodeNumber = Number(episodeNumber);
      }
    }

    if (sources !== undefined) {
      const sourcesValidationError = validateSources(sources);

      if (sourcesValidationError) {
        return res.status(400).json({
          success: false,
          message: sourcesValidationError,
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

    const streams = await Stream.find(query).sort({ updatedAt: -1 }).lean();

    return res.json({
      success: true,
      streams,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list streams",
    });
  }
};
