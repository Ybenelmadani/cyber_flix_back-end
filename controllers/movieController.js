const Favorite = require("../models/Favorite");

const serializeFavorite = (item) => ({
  movieId: item.movieId,
  mediaType: item.mediaType,
  favoriteKey: item.rawFavoriteKey,
  title: item.title,
  poster: item.poster,
  rating: item.rating,
  addedAt: item.addedAt,
});

const addToFavorites = async (req, res) => {
  try {
    const { movieId, title, poster, rating, mediaType = "movie", favoriteKey } = req.body;
    const userId = req.user.id;

    if (!movieId || !title) {
      return res.status(400).json({
        success: false,
        message: "movieId and title are required",
      });
    }

    const key = String(favoriteKey || `${mediaType}-${movieId}`);
    const exists = await Favorite.findOne({ userId, rawFavoriteKey: key });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Item already in favorites",
      });
    }

    await Favorite.create({
      userId,
      movieId: String(movieId),
      mediaType,
      rawFavoriteKey: key,
      title,
      poster,
      rating: Number(rating) || 0,
      addedAt: new Date(),
    });

    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Added to favorites",
      favorites: favorites.map(serializeFavorite),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Item already in favorites",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: favorites.length,
      favorites: favorites.map(serializeFavorite),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawKey = decodeURIComponent(req.params.movieId);

    const removed = await Favorite.findOneAndDelete({ userId, rawFavoriteKey: rawKey });
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Item not found in favorites",
      });
    }

    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      message: "Removed from favorites",
      favorites: favorites.map(serializeFavorite),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
};
