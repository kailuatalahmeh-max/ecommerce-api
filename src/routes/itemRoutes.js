const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");
const { validateItemInput } = require("../middlewares/validateItemInput");
const { validateObjectId } = require("../middlewares/validateObjectId");

// Mounted at /api/items

router.get("/", createLimiter(300), itemController.getItemsData);

router.post(
  "/",
  addLimiter,
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateItemInput,
  itemController.addItem,
);

router.put(
  "/:id",
  createLimiter(50),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateObjectId("id"),
  validateItemInput,
  itemController.editItem,
);

router.delete(
  "/:id",
  createLimiter(300),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  validateObjectId("id"),
  itemController.deleteItem,
);

module.exports = router;
