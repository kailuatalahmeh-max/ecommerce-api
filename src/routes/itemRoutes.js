const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");
const { requireRole } = require("../middlewares/requireRole");

router.post(
  "/api/addItem",
  addLimiter,
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  itemController.addItem,
);
router.delete(
  "/api/deleteItem/:id",
  createLimiter(300),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  itemController.deleteItem,
);
router.put(
  "/api/item/edit/:id",
  createLimiter(50),
  verifyToken,
  requireRole("admin", "moderator", "super_admin"),
  itemController.editItem,
);

router.get(
  "/api/getItemsData",
  createLimiter(300),
  itemController.getItemsData,
);
module.exports = router;
