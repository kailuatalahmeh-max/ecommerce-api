import express from "express";
import * as orderController from "../controllers/orderController";
import { validatePurchaseDetails } from "../middlewares/validationMiddleware";
import { validateGuestId } from "../middlewares/validateGuestId";
import { verifyToken } from "../middlewares/authMiddleware";
import { addLimiter, createLimiter } from "../middlewares/rateLimiter";
import { requireRole } from "../middlewares/requireRole";
const router = express.Router();

router.post(
  "/direct-purchase/set-data",
  createLimiter(300),
  validatePurchaseDetails,
  orderController.directPurchase,
);
router.post(
  "/cart-purchase/set-data/:guestId",
  addLimiter,
  validateGuestId,
  validatePurchaseDetails,
  orderController.cartPurchase,
);
router.get(
  "/order/get-my-orders",
  createLimiter(30),
  orderController.getMyOrders,
);
router.get(
  "/admin-control/orders",
  createLimiter(300),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.getAllOrdersForAdmin,
);
router.patch(
  "/admin-control/order-edit-status",
  createLimiter(300),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.updateOrderStatus,
);

router.post(
  "/guest/verify",
  createLimiter(30),
  orderController.verifyPhoneAndCreateToken,
);

router.get(
  "/guest/orders",
  createLimiter(60),
  orderController.getOrdersByToken,
);

export default router;
