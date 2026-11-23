const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  validatePurchaseDetails,
} = require("../middlewares/validationMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");
const { validateObjectId } = require("../middlewares/validateObjectId");
const { requireStoreWhatsApp } = require("../middlewares/requireStoreWhatsApp");

// Mounted at /api/orders

// Direct purchase of one item (without the cart)
router.post(
  "/",
  createLimiter(300),
  validatePurchaseDetails,
  requireStoreWhatsApp,
  orderController.directPurchase,
);

router.get(
  "/",
  createLimiter(300),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.getAllOrdersForAdmin,
);

router.patch(
  "/:orderId",
  createLimiter(300),
  validateObjectId("orderId"),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.updateOrderStatus,
);

// حالة تأكيد الطلب (الفرونت يسأل عنها بعد الرجوع من واتساب)
router.get(
  "/:id/confirmation",
  createLimiter(300),
  validateObjectId("id"),
  orderController.getOrderConfirmation,
);

// الأدمن: تأكيد الطلب يدوياً بالرمز ورقم المرسل
router.post(
  "/confirm",
  createLimiter(100),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.confirmOrderManually,
);

module.exports = router;
