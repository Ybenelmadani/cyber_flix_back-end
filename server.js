require("dotenv").config();
const connectDb = require("./config/db");
const app = require("./app");

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
