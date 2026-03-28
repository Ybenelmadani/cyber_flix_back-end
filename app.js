const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/tmdb", require("./routes/tmdbRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/streams", require("./routes/streamRoutes"));

app.get("/", (_req, res) => {
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

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
  });
});

app.use(require("./middleware/errorHandler"));

module.exports = app;
