require("dotenv").config();

const app = require("../app");
const connectDb = require("../config/db");

module.exports = async (req, res) => {
  try {
    await connectDb();
    return app(req, res);
  } catch (error) {
    console.error("Unable to connect to database:", error.message);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};
