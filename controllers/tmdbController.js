const axios = require("axios");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const DEFAULT_LANGUAGE = process.env.TMDB_LANGUAGE_DEFAULT || "en-US";
const ALLOWED_LANGUAGES = new Set(["en-US", "fr-FR", "ar-SA"]);

// Ignore broken system proxy settings for direct TMDB calls.
const tmdbClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  proxy: false,
});

const getRequestLanguage = (req) => {
  const requestedLanguage = req.query.language;
  return ALLOWED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : DEFAULT_LANGUAGE;
};

const getRequestPage = (req) => req.query.page || 1;

const tmdbGet = async (path, { req, extraParams = {} } = {}) => {
  const language = getRequestLanguage(req);
  return tmdbClient.get(path, {
    params: {
      api_key: TMDB_API_KEY,
      language,
      ...extraParams,
    },
  });
};

const sendTmdbError = (res, message, error) => {
  console.error("TMDB error:", error.message);
  res.status(500).json({
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
    const response = await tmdbClient.get(`/movie/${req.params.id}/watch/providers`, {
      params: { api_key: TMDB_API_KEY },
    });
    res.json(response.data);
  } catch (error) {
    sendTmdbError(res, "Unable to fetch movie watch providers", error);
  }
};

const getTvWatchProviders = async (req, res) => {
  try {
    const response = await tmdbClient.get(`/tv/${req.params.id}/watch/providers`, {
      params: { api_key: TMDB_API_KEY },
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
  getTvByGenre,
  getTvGenres,
  getTrendingTvShows,
  getTopRatedTvShows,
  getOnTheAirTvShows,
  getMovieWatchProviders,
  getTvWatchProviders,
};
