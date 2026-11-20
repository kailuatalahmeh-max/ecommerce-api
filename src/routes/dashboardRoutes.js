const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

// Mounted at /api/dashboard

router.get(
  "/analytics",
  createLimiter(50),
  verifyToken,
  requireRole("super_admin"),
  adminController.getAnalytics,
);

module.exports = router;
