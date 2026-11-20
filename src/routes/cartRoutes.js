const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const {
  validatePurchaseDetails,
} = require("../middlewares/validationMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");
const { validateGuestId } = require("../middlewares/validateGuestId");
const { validateObjectId } = require("../middlewares/validateObjectId");

// Mounted at /api/carts

router.get(
  "/:guestId",
  createLimiter(50),
  validateGuestId,
  cartController.getCart,
);

router.post(
  "/:guestId/items",
  createLimiter(500),
  validateGuestId,
  cartController.addToCart,
);

router.delete(
  "/:guestId/items",
  createLimiter(100),
  validateGuestId,
  cartController.deleteAllCart,
);

router.delete(
  "/:guestId/items/:id",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.deleteCartItem,
);

router.patch(
  "/:guestId/items/:id/increase",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.increaseQuantity,
);

router.patch(
  "/:guestId/items/:id/decrease",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.reduceQuantity,
);

// Buy everything in the cart (creates an order)
router.post(
  "/:guestId/checkout",
  addLimiter,
  validateGuestId,
  validatePurchaseDetails,
  orderController.cartPurchase,
);

module.exports = router;
