const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/tmdbController");

router.get("/popular", getPopularMovies);
router.get("/search", searchMovies);
router.get("/movie/:id", getMovieDetails);
router.get("/genre/:genreId", getMoviesByGenre);
router.get("/genres", getMovieGenres);
router.get("/trending/:timeWindow?", getTrendingMovies);
router.get("/top-rated", getTopRatedMovies);
router.get("/upcoming", getUpcomingMovies);
router.get("/movie/:id/watch/providers", getMovieWatchProviders);

router.get("/tv/popular", getPopularTvShows);
router.get("/tv/search", searchTvShows);
router.get("/tv/genre/:genreId", getTvByGenre);
router.get("/tv/genres", getTvGenres);
router.get("/tv/trending/:timeWindow?", getTrendingTvShows);
router.get("/tv/top-rated", getTopRatedTvShows);
router.get("/tv/on-the-air", getOnTheAirTvShows);
router.get("/tv/:id/watch/providers", getTvWatchProviders);
router.get("/tv/:id/season/:seasonNumber", getTvSeasonDetails);
router.get("/tv/:id", getTvDetails);

module.exports = router;
