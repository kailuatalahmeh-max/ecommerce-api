import express from "express";
import * as adminController from "../controllers/adminController";
import { verifyToken } from "../middlewares/authMiddleware";
import { createLimiter } from "../middlewares/rateLimiter";
import { requireRole } from "../middlewares/requireRole";
import { validateObjectId } from "../middlewares/validateObjectId";
const router = express.Router();

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

export default router;
