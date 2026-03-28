require("dotenv").config();

const app = require("../app");
const connectDb = require("../config/db");

module.exports = async (req, res) => {
  const pathname = (() => {
    try {
      return new URL(req.url, "https://cyberflix.local").pathname;
    } catch {
      return req.url || "/";
    }
  })();

  if (
    pathname === "/" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/tmdb")
  ) {
    return app(req, res);
  }

  try {
    await connectDb();
    return app(req, res);
  } catch (error) {
    console.error("Unable to connect to database:", error.message);
    return res.status(503).json({
      success: false,
      message:
        "Database connection failed. Verify MONGO_URI and MongoDB Atlas Network Access.",
    });
  }
};
