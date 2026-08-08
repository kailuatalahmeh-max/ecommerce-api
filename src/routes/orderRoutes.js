const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");

router.post("/direct-purchase/set-data", createLimiter(300), orderController.directPurchase);
router.post("/cart-purchase/set-data/:guestId", addLimiter, orderController.cartPurchase);
router.get("/order/get-my-orders", createLimiter(30), orderController.getMyOrders);
router.get("/admin-control/orders", verifyToken, createLimiter(300), orderController.getAllOrdersForAdmin);
router.patch("/admin-control/order-edit-status", createLimiter(300), verifyToken, orderController.updateOrderStatus);

module.exports = router;