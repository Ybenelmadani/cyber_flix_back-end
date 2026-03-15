require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const Favorite = require("../models/Favorite");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyberflix";
const RESET = process.argv.includes("--reset");

const demoUser = {
  email: "demo@cyberflix.com",
  name: "Demo User",
  password: "123456",
  plan: "free",
  language: "en",
};

const demoFavorites = [
  {
    movieId: "550",
    mediaType: "movie",
    rawFavoriteKey: "movie-550",
    title: "Fight Club",
    poster: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    rating: 8.4,
  },
  {
    movieId: "1399",
    mediaType: "tv",
    rawFavoriteKey: "tv-1399",
    title: "Game of Thrones",
    poster: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    rating: 8.4,
  },
  {
    movieId: "66732",
    mediaType: "tv",
    rawFavoriteKey: "tv-66732",
    title: "Stranger Things",
    poster: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    rating: 8.6,
  },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI, { autoIndex: true });
  console.log(`Connected to MongoDB: ${MONGO_URI}`);

  if (RESET) {
    await Favorite.deleteMany({});
    await User.deleteMany({});
    console.log("Reset done: users and favorites collections cleared.");
  }

  const hashedPassword = await bcrypt.hash(demoUser.password, 10);

  const user = await User.findOneAndUpdate(
    { email: demoUser.email.toLowerCase() },
    {
      $set: {
        name: demoUser.name,
        password: hashedPassword,
        plan: demoUser.plan,
        language: demoUser.language,
      },
      $setOnInsert: {
        email: demoUser.email.toLowerCase(),
      },
    },
    { returnDocument: "after", upsert: true }
  );

  for (const item of demoFavorites) {
    await Favorite.findOneAndUpdate(
      { userId: user._id, rawFavoriteKey: item.rawFavoriteKey },
      {
        $set: {
          movieId: String(item.movieId),
          mediaType: item.mediaType,
          title: item.title,
          poster: item.poster,
          rating: Number(item.rating) || 0,
          addedAt: new Date(),
        },
        $setOnInsert: {
          userId: user._id,
          rawFavoriteKey: item.rawFavoriteKey,
        },
      },
      { upsert: true }
    );
  }

  const favoritesCount = await Favorite.countDocuments({ userId: user._id });
  console.log("Seed complete.");
  console.log(`Demo user: ${demoUser.email}`);
  console.log(`Demo password: ${demoUser.password}`);
  console.log(`Favorites inserted/updated: ${favoritesCount}`);
};

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  });
