const express = require("express");
const { authRequired } = require("../middleware/auth");
const { createCheckoutSession, mockUpgradePremium } = require("../controllers/paymentController");

const router = express.Router();

router.post("/checkout-session", authRequired, createCheckoutSession);
router.post("/mock-upgrade", authRequired, mockUpgradePremium);

module.exports = router;

