require("dotenv").config();
const mongoose = require("mongoose");
const connectDb = require("../config/db");
const Stream = require("../models/Stream");

const DEMO_SOURCE = {
  url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  quality: "720p",
  type: "hls",
  language: "VO",
  isPremium: false,
};

const toKey = (value) =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildSource = (name, sourceOverride = "") => {
  const trimmedOverride = String(sourceOverride || "").trim();

  if (!trimmedOverride) {
    return {
      ...DEMO_SOURCE,
      name,
    };
  }

  if (/^https?:\/\//i.test(trimmedOverride)) {
    return {
      name,
      quality: DEMO_SOURCE.quality,
      url: trimmedOverride,
      type: trimmedOverride.includes(".m3u8") ? "hls" : "mp4",
      language: DEMO_SOURCE.language,
      isPremium: DEMO_SOURCE.isPremium,
    };
  }

  const muxMatch = trimmedOverride.match(/^mux:(.+)$/i);
  if (muxMatch) {
    return {
      ...DEMO_SOURCE,
      name,
      provider: "mux",
      playbackId: muxMatch[1].trim(),
    };
  }

  const cloudflareMatch = trimmedOverride.match(/^cloudflare:(.+)$/i);
  if (cloudflareMatch) {
    return {
      ...DEMO_SOURCE,
      name,
      provider: "cloudflare",
      playbackId: cloudflareMatch[1].trim(),
    };
  }

  return {
    ...DEMO_SOURCE,
    name,
    playbackId: trimmedOverride,
    url: "",
  };
};

const getMovieUrlOverride = (title) => {
  const envKey = `STREAM_${toKey(title)}_URL`;
  return process.env[envKey] || "";
};

const getEpisodeUrlOverride = (seriesTitle, seasonNumber, episodeNumber) => {
  const envKey = `STREAM_${toKey(seriesTitle)}_S${seasonNumber}E${episodeNumber}_URL`;
  return process.env[envKey] || "";
};

function buildMovieStream(tmdbId, title) {
  return {
    tmdbId: String(tmdbId),
    mediaType: "movie",
    seasonNumber: null,
    episodeNumber: null,
    title,
    poster: "",
    sources: [
      buildSource(`${title} - Demo`, getMovieUrlOverride(title)),
    ],
  };
}

function buildEpisodeStreams(tmdbId, seriesTitle, seasonNumber, episodeCount) {
  return Array.from({ length: episodeCount }, (_, index) => {
    const episodeNumber = index + 1;

    return {
      tmdbId: String(tmdbId),
      mediaType: "tv",
      seasonNumber,
      episodeNumber,
      title: `${seriesTitle} - S${seasonNumber}E${episodeNumber}`,
      poster: "",
      sources: [
        buildSource(
          `${seriesTitle} - Episode ${episodeNumber}`,
          getEpisodeUrlOverride(seriesTitle, seasonNumber, episodeNumber)
        ),
      ],
    };
  });
}

async function run() {
  try {
    await connectDb();

    const streams = [
      buildMovieStream("550", "Fight Club"),
      buildMovieStream("157336", "Interstellar"),
      ...buildEpisodeStreams("1396", "Breaking Bad", 1, 7),
      ...buildEpisodeStreams("66732", "Stranger Things", 1, 8),
      ...buildEpisodeStreams("119051", "Wednesday", 1, 8),
    ];

    for (const item of streams) {
      const query = {
        tmdbId: String(item.tmdbId),
        mediaType: item.mediaType,
        seasonNumber: item.mediaType === "tv" ? item.seasonNumber : null,
        episodeNumber: item.mediaType === "tv" ? item.episodeNumber : null,
      };

      await Stream.findOneAndUpdate(
        query,
        { $set: item },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log(`Seed completed: ${streams.length} items.`);
    console.log("Search these titles in the app:");
    console.log("- Fight Club");
    console.log("- Interstellar");
    console.log("- Breaking Bad");
    console.log("- Stranger Things");
    console.log("- Wednesday");
    console.log("");
    console.log("Optional environment overrides:");
    console.log("- full URL: STREAM_INTERSTELLAR_URL=https://your-legal-stream.m3u8");
    console.log("- mux playbackId: STREAM_INTERSTELLAR_URL=mux:yourPlaybackId");
    console.log("- cloudflare playbackId: STREAM_INTERSTELLAR_URL=cloudflare:yourPlaybackId");
  } catch (error) {
    console.error("Seed streams failed:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  }
}

run();
