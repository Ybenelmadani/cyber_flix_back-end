const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getJwtSecret = () => String(process.env.JWT_SECRET || "").trim();

const extractToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
};

const authRequired = async (req, res, next) => {
  try {
    const jwtSecret = getJwtSecret();

    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is required",
      });
    }

    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const jwtSecret = getJwtSecret();

    if (!jwtSecret) {
      req.user = null;
      return next();
    }

    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select("-password");

    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
};

module.exports = {
  authRequired,
  optionalAuth,
};
