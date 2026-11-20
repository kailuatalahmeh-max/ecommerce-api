const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  validatePurchaseDetails,
} = require("../middlewares/validationMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

// Mounted at /api/orders

// Direct purchase of one item (without the cart)
router.post(
  "/",
  createLimiter(300),
  validatePurchaseDetails,
  orderController.directPurchase,
);

router.get(
  "/",
  createLimiter(300),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.getAllOrdersForAdmin,
);

// GET /api/orders/lookup?phoneNumber=
router.get("/lookup", createLimiter(30), orderController.getMyOrders);

router.patch(
  "/:orderId",
  createLimiter(300),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.updateOrderStatus,
);

module.exports = router;
