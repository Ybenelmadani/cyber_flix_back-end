const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyberflix";

const connectDb = async () => {
  await mongoose.connect(MONGO_URI, {
    autoIndex: true,
  });
  console.log(`MongoDB connected: ${MONGO_URI}`);
};

module.exports = connectDb;
