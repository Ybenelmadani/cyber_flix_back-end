const jwt = require("jsonwebtoken");
const User = require("../models/User");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeUser = (userDoc) => ({
  id: String(userDoc._id),
  email: userDoc.email,
  name: userDoc.name || "",
  plan: userDoc.plan || "free",
  language: userDoc.language || "en",
  preferredLanguage: userDoc.language || "en",
});

const buildToken = (userDoc) =>
  jwt.sign(
    {
      id: String(userDoc._id),
      email: userDoc.email,
      plan: userDoc.plan || "free",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const register = async (req, res) => {
  try {
    const { email, password, name = "" } = req.body;
    const trimmedName = String(name).trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const createdUser = await User.create({
      email: normalizedEmail,
      name: trimmedName,
      password,
      plan: "free",
      language: "en",
    });

    const token = buildToken(createdUser);
    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = buildToken(user);
    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const setPreferredLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    const allowed = new Set(["en", "fr", "ar"]);

    if (!allowed.has(language)) {
      return res.status(400).json({ success: false, message: "Unsupported language" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { language } },
      { new: true }
    );

    return res.json({ success: true, user: sanitizeUser(updated) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const upgradePremium = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.user.id, { $set: { plan: "premium" } }, { new: true });
    return res.json({
      success: true,
      message: "Premium activated",
      user: sanitizeUser(updated),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  me,
  setPreferredLanguage,
  upgradePremium,
};
