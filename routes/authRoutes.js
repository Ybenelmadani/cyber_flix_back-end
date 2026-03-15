const express = require("express");
const {
  register,
  login,
  me,
  setPreferredLanguage,
  upgradePremium,
} = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authRequired, me);
router.patch("/language", authRequired, setPreferredLanguage);
router.post("/upgrade", authRequired, upgradePremium);

module.exports = router;

