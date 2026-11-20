const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");
const { validateObjectId } = require("../middlewares/validateObjectId");

// Mounted at /api/admins

router.post(
  "/",
  createLimiter(5),
  verifyToken,
  requireRole("super_admin"),
  adminController.createAdmin,
);

router.get(
  "/",
  createLimiter(200),
  verifyToken,
  requireRole("super_admin"),
  adminController.getAdminsData,
);

router.patch(
  "/:adminId/disable",
  createLimiter(10),
  verifyToken,
  requireRole("super_admin"),
  validateObjectId("adminId"),
  adminController.disableAdmin,
);

router.patch(
  "/:adminId/enable",
  createLimiter(10),
  verifyToken,
  requireRole("super_admin"),
  validateObjectId("adminId"),
  adminController.enableAdmin,
);

module.exports = router;
