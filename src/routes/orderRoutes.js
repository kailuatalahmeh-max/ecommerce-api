const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  validatePurchaseDetails,
} = require("../middlewares/validationMiddleware");
const { validateGuestId } = require("../middlewares/validateGuestId");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

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

module.exports = router;
