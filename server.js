const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDb = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/tmdb", require("./routes/tmdbRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/streams", require("./routes/streamRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "CYBERFLIX API Running",
    version: "1.0.0",
    endpoints: {
      tmdb: "/api/tmdb",
      auth: "/api/auth",
      movies: "/api/movies",
      payments: "/api/payments",
      streams: "/api/streams",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
  });
});

// Error handling
app.use(require("./middleware/errorHandler"));

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDb();

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`TMDB API: ${process.env.TMDB_BASE_URL}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Stop the other process or change PORT in .env.`
        );
      } else {
        console.error("Server error:", error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();