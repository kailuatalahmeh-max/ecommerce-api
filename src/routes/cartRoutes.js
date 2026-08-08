const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { createLimiter } = require("../middlewares/rateLimiter");

router.post("/add", createLimiter(500), cartController.addToCart);
router.get("/:guestId", createLimiter(50), cartController.getCart);
router.delete("/delete/:id", createLimiter(50), cartController.deleteCartItem);
router.post(
  "/add-quantity/:id",
  createLimiter(50),
  cartController.increaseQuantity,
);
router.patch(
  "/reducing-quantity/:id",
  createLimiter(50),
  cartController.reduceQuantity,
);
router.delete(
  "/delete-all/:guestId",
  createLimiter(100),
  cartController.deleteAllCart,
);

module.exports = router;
