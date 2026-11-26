const express = require("express");
const router = express.Router();
const storeSettingsController = require("../controllers/storeSettingsController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

// Mounted at /api/store-settings (super_admin only)

router.get(
  "/",
  createLimiter(100),
  verifyToken,
  requireRole("super_admin"),
  storeSettingsController.getStoreSettings,
);

router.put(
  "/",
  createLimiter(20),
  verifyToken,
  requireRole("super_admin"),
  storeSettingsController.updateStoreSettings,
);

module.exports = router;
