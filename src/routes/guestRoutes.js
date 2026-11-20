const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { createLimiter } = require("../middlewares/rateLimiter");

// Mounted at /api/guest

// Create a guest session (token) from a phone number
router.post(
  "/sessions",
  createLimiter(30),
  orderController.verifyPhoneAndCreateToken,
);

// Get the orders of the current guest (x-guest-token header)
router.get("/orders", createLimiter(60), orderController.getOrdersByToken);

module.exports = router;
