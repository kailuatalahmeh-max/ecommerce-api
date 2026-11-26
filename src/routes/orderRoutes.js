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
const {
  validateTrackOrder,
  validateTrackMany,
} = require("../middlewares/validateTrackOrder");

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

// TODO
// حالة تأكيد الطلب (الفرونت يسأل عنها بعد الرجوع من واتساب)
if (process.env.WHATSAPP_BOT_ENABLED === "true") {
  router.get(
    "/:id/confirmation",
    createLimiter(300),
    validateObjectId("id"),
    requireRole("bot"),
    orderController.getOrderConfirmation,
  );
}

// الأدمن: تأكيد الطلب يدوياً بالرمز ورقم المرسل
router.post(
  "/confirm",
  createLimiter(100),
  verifyToken,
  requireRole("moderator", "super_admin"),
  orderController.confirmOrderManually,
);

// الزبون: طلب واحد برمز التأكيد + رقم الهاتف
router.post(
  "/track",
  createLimiter(20),
  validateTrackOrder,
  orderController.trackOrder,
);

// الزبون: بيانات جديدة لكل الطلبات المحفوظة في المتصفح (حتى 20 بطلب واحد)
router.post(
  "/track-many",
  createLimiter(60),
  validateTrackMany,
  orderController.trackManyOrders,
);

// الزبون: إلغاء طلب "Pending" برمز التأكيد + رقم الهاتف (المخزون يرجع)
router.post(
  "/cancel",
  createLimiter(20),
  validateTrackOrder,
  orderController.cancelOrder,
);

module.exports = router;
