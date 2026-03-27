const axios = require("axios");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const DEFAULT_LANGUAGE = process.env.TMDB_LANGUAGE_DEFAULT || "en-US";
const TMDB_TIMEOUT_MS = Number(process.env.TMDB_TIMEOUT_MS) || 20000;
const TMDB_RETRY_COUNT = Number(process.env.TMDB_RETRY_COUNT) || 1;
const TMDB_CACHE_TTL_MS = Number(process.env.TMDB_CACHE_TTL_MS) || 60000;
const ALLOWED_LANGUAGES = new Set(["en-US", "fr-FR", "ar-SA"]);
const tmdbCache = new Map();
const tmdbInFlight = new Map();

// Ignore broken system proxy settings for direct TMDB calls.
const tmdbClient = axios.create({
  baseURL: BASE_URL,
  timeout: TMDB_TIMEOUT_MS,
  proxy: false,
});

const getRequestLanguage = (req) => {
  const requestedLanguage = req.query.language;
  return ALLOWED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : DEFAULT_LANGUAGE;
};

const getRequestPage = (req) => req.query.page || 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildCacheKey = (path, params) => {
  const query = new URLSearchParams();

  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      query.append(key, String(value));
    });

  return `${path}?${query.toString()}`;
};

const getCachedValue = (cacheKey) => {
  const cachedEntry = tmdbCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    tmdbCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data;
};

const setCachedValue = (cacheKey, data) => {
  tmdbCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
  });
};

const isRetryableTmdbError = (error) => {
  const status = error.response?.status;

  return (
    error.code === "ECONNABORTED" ||
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("timeout")) ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
};

const fetchTmdb = async (path, params) => {
  let attempt = 0;

  while (true) {
    try {
      return await tmdbClient.get(path, { params });
    } catch (error) {
      if (attempt >= TMDB_RETRY_COUNT || !isRetryableTmdbError(error)) {
        throw error;
      }

      attempt += 1;
      await sleep(400 * attempt);
    }
  }
};

const tmdbGet = async (path, { req, extraParams = {}, includeLanguage = true } = {}) => {
  const params = {
    api_key: TMDB_API_KEY,
    ...(includeLanguage ? { language: getRequestLanguage(req) } : {}),
    ...extraParams,
  };
  const cacheKey = buildCacheKey(path, params);
  const cachedData = getCachedValue(cacheKey);

  if (cachedData) {
    return { data: cachedData };
  }

  const inFlightRequest = tmdbInFlight.get(cacheKey);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const requestPromise = fetchTmdb(path, params)
    .then((response) => {
      setCachedValue(cacheKey, response.data);
      return { data: response.data };
    })
    .finally(() => {
      tmdbInFlight.delete(cacheKey);
    });

  tmdbInFlight.set(cacheKey, requestPromise);
  return requestPromise;
};

const sendTmdbError = (res, message, error) => {
  console.error("TMDB error:", {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    url: error.config?.url,
  });

  const statusCode = error.code === "ECONNABORTED" ? 504 : 500;

  res.status(statusCode).json({
    success: false,
    message,
    error: error.message,
  });
};

const getPopularMovies = async (req, res) => {
  try {
    const response = await tmdbGet("/movie/popular", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch popular movies", error);
  }
};

const searchMovies = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Parameter 'query' is required" });
    }

    const response = await tmdbGet("/search/movie", {
      req,
      extraParams: {
        query,
        page: getRequestPage(req),
      },
    });

    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to search movies", error);
  }
};

const getMovieDetails = async (req, res) => {
  try {
    const response = await tmdbGet(`/movie/${req.params.id}`, {
      req,
      extraParams: { append_to_response: "videos,credits,similar" },
    });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch movie details", error);
  }
};

const getMoviesByGenre = async (req, res) => {
  try {
    const response = await tmdbGet("/discover/movie", {
      req,
      extraParams: {
        with_genres: req.params.genreId,
        page: getRequestPage(req),
        sort_by: "popularity.desc",
      },
    });

    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch movies by genre", error);
  }
};

const getMovieGenres = async (req, res) => {
  try {
    const response = await tmdbGet("/genre/movie/list", { req });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch movie genres", error);
  }
};

const getTrendingMovies = async (req, res) => {
  try {
    const timeWindow = req.params.timeWindow || "week";
    const response = await tmdbGet(`/trending/movie/${timeWindow}`, { req });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch trending movies", error);
  }
};

const getTopRatedMovies = async (req, res) => {
  try {
    const response = await tmdbGet("/movie/top_rated", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch top rated movies", error);
  }
};

const getUpcomingMovies = async (req, res) => {
  try {
    const response = await tmdbGet("/movie/upcoming", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch upcoming movies", error);
  }
};

const getPopularTvShows = async (req, res) => {
  try {
    const response = await tmdbGet("/tv/popular", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch popular TV shows", error);
  }
};

const searchTvShows = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Parameter 'query' is required" });
    }

    const response = await tmdbGet("/search/tv", {
      req,
      extraParams: {
        query,
        page: getRequestPage(req),
      },
    });

    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to search TV shows", error);
  }
};

const getTvDetails = async (req, res) => {
  try {
    const response = await tmdbGet(`/tv/${req.params.id}`, {
      req,
      extraParams: { append_to_response: "videos,credits,similar" },
    });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch TV show details", error);
  }
};

const getTvSeasonDetails = async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;
    const response = await tmdbGet(`/tv/${id}/season/${seasonNumber}`, { req });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch season details", error);
  }
};

const getTvEpisodeDetails = async (req, res) => {
  try {
    const { id, seasonNumber, episodeNumber } = req.params;
    const response = await tmdbGet(
      `/tv/${id}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        req,
        extraParams: { append_to_response: "credits,videos,images" },
      }
    );
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch episode details", error);
  }
};

const getTvByGenre = async (req, res) => {
  try {
    const response = await tmdbGet("/discover/tv", {
      req,
      extraParams: {
        with_genres: req.params.genreId,
        page: getRequestPage(req),
        sort_by: "popularity.desc",
      },
    });

    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch TV shows by genre", error);
  }
};

const getTvGenres = async (req, res) => {
  try {
    const response = await tmdbGet("/genre/tv/list", { req });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch TV genres", error);
  }
};

const getTrendingTvShows = async (req, res) => {
  try {
    const timeWindow = req.params.timeWindow || "week";
    const response = await tmdbGet(`/trending/tv/${timeWindow}`, { req });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch trending TV shows", error);
  }
};

const getTopRatedTvShows = async (req, res) => {
  try {
    const response = await tmdbGet("/tv/top_rated", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch top rated TV shows", error);
  }
};

const getOnTheAirTvShows = async (req, res) => {
  try {
    const response = await tmdbGet("/tv/on_the_air", { req, extraParams: { page: getRequestPage(req) } });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch on-the-air TV shows", error);
  }
};

const getMovieWatchProviders = async (req, res) => {
  try {
    const response = await tmdbGet(`/movie/${req.params.id}/watch/providers`, {
      extraParams: {},
      includeLanguage: false,
    });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch movie watch providers", error);
  }
};

const getTvWatchProviders = async (req, res) => {
  try {
    const response = await tmdbGet(`/tv/${req.params.id}/watch/providers`, {
      extraParams: {},
      includeLanguage: false,
    });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch TV watch providers", error);
  }
};

module.exports = {
  getPopularMovies,
  searchMovies,
  getMovieDetails,
  getMoviesByGenre,
  getMovieGenres,
  getTrendingMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getPopularTvShows,
  searchTvShows,
  getTvDetails,
  getTvSeasonDetails,
  getTvEpisodeDetails,
  getTvByGenre,
  getTvGenres,
  getTrendingTvShows,
  getTopRatedTvShows,
  getOnTheAirTvShows,
  getMovieWatchProviders,
  getTvWatchProviders,
};
