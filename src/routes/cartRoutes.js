const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { createLimiter } = require("../middlewares/rateLimiter");
const { validateGuestId } = require("../middlewares/validateGuestId");
const { validateObjectId } = require("../middlewares/validateObjectId");

router.post(
  "/add/:guestId",
  createLimiter(500),
  validateGuestId,
  cartController.addToCart,
);
router.get(
  "/:guestId",
  createLimiter(50),
  validateGuestId,
  cartController.getCart,
);
router.delete(
  "/delete/:guestId/:id",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.deleteCartItem,
);
router.patch(
  "/add-quantity/:guestId/:id",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.increaseQuantity,
);
router.patch(
  "/reducing-quantity/:guestId/:id",
  createLimiter(50),
  validateGuestId,
  validateObjectId("id"),
  cartController.reduceQuantity,
);
router.delete(
  "/delete-all/:guestId",
  createLimiter(100),
  validateGuestId,
  cartController.deleteAllCart,
);

module.exports = router;
