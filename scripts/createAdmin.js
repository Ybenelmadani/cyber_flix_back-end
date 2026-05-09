require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyberflix";

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
};

const admin = {
  email: getArgValue("email") || process.env.ADMIN_EMAIL,
  password: getArgValue("password") || process.env.ADMIN_PASSWORD,
  name: getArgValue("name") || process.env.ADMIN_NAME || "Admin",
};

const createAdmin = async () => {
  if (!admin.email || !admin.password) {
    throw new Error(
      "Missing admin credentials. Use --email and --password, or set ADMIN_EMAIL and ADMIN_PASSWORD."
    );
  }

  if (String(admin.password).length < 6) {
    throw new Error("Admin password must be at least 6 characters.");
  }

  await mongoose.connect(MONGO_URI, { autoIndex: true });

  const email = String(admin.email).trim().toLowerCase();
  const user =
    (await User.findOne({ email })) ||
    new User({
      email,
    });

  user.name = String(admin.name).trim() || "Admin";
  user.password = admin.password;
  user.role = "admin";
  user.plan = "premium";
  await user.save();

  console.log("Admin account ready.");
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Plan: ${user.plan}`);
};

createAdmin()
  .catch((error) => {
    console.error("Create admin failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  });
