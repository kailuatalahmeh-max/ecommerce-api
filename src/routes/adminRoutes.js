const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");
const { validateObjectId } = require("../middlewares/validateObjectId");

router.post(
  "/create-new-admin",
  createLimiter(5),
  verifyToken,
  requireRole("super_admin"),
  adminController.createAdmin,
);

router.post("/logIn", createLimiter(10), adminController.loginAdmin);

router.get(
  "/analytics",
  createLimiter(50),
  verifyToken,
  requireRole("super_admin"),
  adminController.getAnalytics,
);

router.get(
  "/get-admins",
  createLimiter(200),
  verifyToken,
  requireRole("super_admin"),
  adminController.getAdminsData,
);

router.put(
  "/disable-admin/:adminId",
  createLimiter(10),
  verifyToken,
  requireRole("super_admin"),
  validateObjectId("adminId"),
  adminController.disableAdmin,
);

router.put(
  "/enable-admin/:adminId",
  createLimiter(10),
  verifyToken,
  requireRole("super_admin"),
  validateObjectId("adminId"),
  adminController.enableAdmin,
);

module.exports = router;
