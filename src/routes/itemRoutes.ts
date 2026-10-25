import express from "express";
import * as itemController from "../controllers/itemController";
import { verifyToken } from "../middlewares/authMiddleware";
import { addLimiter, createLimiter } from "../middlewares/rateLimiter";
import { requireRole } from "../middlewares/requireRole";
import { validateItemInput } from "../middlewares/validateItemInput";
import { validateObjectId } from "../middlewares/validateObjectId";
const router = express.Router();

router.post(
  "/addItem",
  addLimiter,
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateItemInput,
  itemController.addItem,
);
router.delete(
  "/deleteItem/:id",
  createLimiter(300),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateObjectId("id"),
  itemController.deleteItem,
);
router.put(
  "/item/edit/:id",
  createLimiter(50),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateObjectId("id"),
  validateItemInput,
  itemController.editItem,
);

router.get("/getItemsData", createLimiter(300), itemController.getItemsData);

export default router;
