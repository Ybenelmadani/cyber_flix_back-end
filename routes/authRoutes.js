const express = require("express");
const {
  register,
  login,
  me,
  setPreferredLanguage,
  upgradePremium,
} = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authRequired, me);
router.patch("/language", authRequired, setPreferredLanguage);
router.post("/upgrade", authRequired, upgradePremium);

module.exports = router;

