const express = require("express");
const router = express.Router();
const storeSettingsController = require("../controllers/storeSettingsController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

// Mounted at /api/store-settings (super_admin only, except /public)

// Everyone: only the store WhatsApp number (for "Contact support")
router.get(
  "/public",
  createLimiter(300),
  storeSettingsController.getPublicStoreSettings,
);

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
