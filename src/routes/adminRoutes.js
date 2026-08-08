const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");

router.post(
  "/create-new-admin",
  createLimiter(5),
  verifyToken,
  adminController.createAdmin,
);

router.post("/logIn", createLimiter(10), adminController.loginAdmin);

router.get(
  "/analytics",
  createLimiter(50),
  verifyToken,
  adminController.getAnalytics,
);

module.exports = router;
