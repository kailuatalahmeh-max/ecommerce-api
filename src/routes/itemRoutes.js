const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");
const { validateItemInput } = require("../middlewares/validateItemInput");
const { validateObjectId } = require("../middlewares/validateObjectId");

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
module.exports = router;
