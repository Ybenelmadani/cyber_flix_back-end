const Stripe = require("stripe");
const User = require("../models/User");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || "";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const createCheckoutSession = async (req, res) => {
  if (!stripe || !STRIPE_PREMIUM_PRICE_ID) {
    return res.status(400).json({
      success: false,
      message: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PREMIUM_PRICE_ID.",
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_BASE_URL}/?checkout=success`,
      cancel_url: `${APP_BASE_URL}/?checkout=cancel`,
      metadata: {
        userId: req.user.id,
      },
      client_reference_id: req.user.id,
    });

    return res.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const mockUpgradePremium = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { plan: "premium" } }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Premium activated in mock mode",
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name || "",
        plan: user.plan || "free",
        role: user.role || "user",
        language: user.language || "en",
        preferredLanguage: user.language || "en",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createCheckoutSession,
  mockUpgradePremium,
};
