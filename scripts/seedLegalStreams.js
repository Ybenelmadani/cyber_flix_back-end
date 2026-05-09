require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const connectDb = require("../config/db");
const Stream = require("../models/Stream");

const env = (key, fallback = "") =>
  String(process.env[key] || fallback).trim();

const TMDB_API_KEY = env("TMDB_API_KEY");
const TMDB_BASE_URL = env("TMDB_BASE_URL", "https://api.themoviedb.org/3");

const LEGAL_TITLE_CATALOG = [
  { title: "Night of the Living Dead", year: 1968 },
  { title: "His Girl Friday", year: 1940 },
  { title: "Plan 9 from Outer Space", year: 1959 },
  { title: "Detour", year: 1945 },
  { title: "D.O.A.", year: 1950 },
  { title: "The Last Man on Earth", year: 1964 },
  { title: "Little Shop of Horrors", year: 1960 },
  { title: "Charade", year: 1963 },
  { title: "The Fast and the Furious", year: 1954 },
  { title: "The Phantom of the Opera", year: 1925 },
  { title: "The General", year: 1926 },
  { title: "The Kid", year: 1921 },
  { title: "Sherlock Jr.", year: 1924 },
  { title: "Steamboat Bill, Jr.", year: 1928 },
  { title: "A Star Is Born", year: 1937 },
  { title: "The Stranger", year: 1946 },
  { title: "Gulliver's Travels", year: 1939 },
  { title: "Santa Claus Conquers the Martians", year: 1964 },
  { title: "Reefer Madness", year: 1936 },
  { title: "The Brain That Wouldn't Die", year: 1962 },
  { title: "Carnival of Souls", year: 1962 },
  { title: "House on Haunted Hill", year: 1959 },
  { title: "Nosferatu", year: 1922 },
  { title: "Metropolis", year: 1927 },
  { title: "M", year: 1931 },
  { title: "The Cabinet of Dr. Caligari", year: 1920 },
  { title: "The Hunchback of Notre Dame", year: 1923 },
  { title: "The Gold Rush", year: 1925 },
  { title: "The Mark of Zorro", year: 1920 },
  { title: "The Blood of a Poet", year: 1930 },
  { title: "The Hitch-Hiker", year: 1953 },
  { title: "The Terror", year: 1963 },
  { title: "The Little Princess", year: 1939 },
  { title: "The Man with the Golden Arm", year: 1955 },
  { title: "Penny Serenade", year: 1941 },
  { title: "The Great Train Robbery", year: 1903 },
  { title: "The Last Time I Saw Paris", year: 1954 },
  { title: "The Stranger Wore a Gun", year: 1953 },
  { title: "The Amazing Mr. X", year: 1948 },
  { title: "Beat the Devil", year: 1953 },
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const parseYear = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string") return null;
  const year = Number(dateValue.slice(0, 4));
  return Number.isFinite(year) ? year : null;
};

const chooseBestTmdbResult = (results = [], title, year) => {
  const normalizedTarget = normalizeText(title);

  const scored = results
    .map((item) => {
      const candidateTitle = item.title || item.name || "";
      const normalizedCandidate = normalizeText(candidateTitle);
      const candidateYear = parseYear(item.release_date || item.first_air_date);

      let score = 0;
      if (normalizedCandidate === normalizedTarget) score += 50;
      if (normalizedCandidate.includes(normalizedTarget)) score += 20;
      if (year && candidateYear === year) score += 30;
      if (year && candidateYear && Math.abs(candidateYear - year) <= 1) score += 15;
      const popularity = Number(item.popularity || 0);
      score += Number.isFinite(popularity) ? Math.min(popularity, 20) : 0;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item || null;
};

const resolveTmdbMovie = async (title, year) => {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is required for seed:legal");
  }

  const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
    params: {
      api_key: TMDB_API_KEY,
      query: title,
      include_adult: false,
      page: 1,
    },
    timeout: 15000,
  });

  const results = Array.isArray(response.data?.results)
    ? response.data.results
    : [];

  if (!results.length) return null;
  return chooseBestTmdbResult(results, title, year);
};

const buildLegalSourceForIndex = (index) => {
  const cycle = index % 4;

  if (cycle === 0) {
    return {
      name: "YouTube Legal Demo",
      provider: "youtube",
      playbackId: env("LEGAL_STREAM_YOUTUBE_ID", "M7lc1UVf-VE"),
      url: "",
      path: "",
      type: "embed",
      quality: "auto",
      language: "VO",
      isPremium: false,
      isLegal: true,
    };
  }

  if (cycle === 1) {
    return {
      name: "Vimeo Legal Demo",
      provider: "vimeo",
      playbackId: env("LEGAL_STREAM_VIMEO_ID", "76979871"),
      url: "",
      path: "",
      type: "embed",
      quality: "auto",
      language: "VO",
      isPremium: false,
      isLegal: true,
    };
  }

  if (cycle === 2) {
    return {
      name: "Dailymotion Legal Demo",
      provider: "dailymotion",
      playbackId: env("LEGAL_STREAM_DAILYMOTION_ID", "x84sh87"),
      url: "",
      path: "",
      type: "embed",
      quality: "auto",
      language: "VO",
      isPremium: false,
      isLegal: true,
    };
  }

  return {
    name: "Archive.org Legal MP4",
    provider: "archive",
    playbackId: "",
    url: env(
      "LEGAL_STREAM_ARCHIVE_URL",
      "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4"
    ),
    path: "",
    type: "mp4",
    quality: "480p",
    language: "VO",
    isPremium: false,
    isLegal: true,
  };
};

async function run() {
  try {
    await connectDb();
    let inserted = 0;
    let skipped = 0;

    for (let index = 0; index < LEGAL_TITLE_CATALOG.length; index += 1) {
      const entry = LEGAL_TITLE_CATALOG[index];
      const tmdbMovie = await resolveTmdbMovie(entry.title, entry.year);

      if (!tmdbMovie?.id) {
        skipped += 1;
        console.log(`Skip (not found): ${entry.title} (${entry.year || "?"})`);
        continue;
      }

      const item = {
        tmdbId: String(tmdbMovie.id),
        mediaType: "movie",
        seasonNumber: null,
        episodeNumber: null,
        title: tmdbMovie.title || entry.title,
        poster: tmdbMovie.poster_path || "",
        sources: [buildLegalSourceForIndex(index)],
      };

      const query = {
        tmdbId: String(item.tmdbId),
        mediaType: item.mediaType,
        seasonNumber: item.mediaType === "tv" ? Number(item.seasonNumber) : null,
        episodeNumber: item.mediaType === "tv" ? Number(item.episodeNumber) : null,
      };

      await Stream.findOneAndUpdate(
        query,
        { $set: item },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      inserted += 1;
      console.log(
        `Upsert: ${item.title} (TMDB ${item.tmdbId}) -> ${item.sources[0].provider}`
      );
    }

    console.log("");
    console.log(`Legal seed completed: ${inserted} upserted, ${skipped} skipped.`);
    console.log("Useful endpoint:");
    console.log("- GET /api/streams/legal");
  } catch (error) {
    console.error("Legal seed failed:", error.message);
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
