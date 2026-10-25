import express from "express";
import * as cartController from "../controllers/cartController";
import { createLimiter } from "../middlewares/rateLimiter";
import { validateGuestId } from "../middlewares/validateGuestId";
import { validateObjectId } from "../middlewares/validateObjectId";
const router = express.Router();

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

export default router;
