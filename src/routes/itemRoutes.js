const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addLimiter, createLimiter } = require("../middlewares/rateLimiter");

router.post("/addItem", addLimiter, verifyToken, itemController.addItem);
router.get("/api/getItemsData", createLimiter(300), itemController.getItemsData);
router.delete("/api/deleteItem/:id", createLimiter(300), verifyToken, itemController.deleteItem);
router.put("/api/item/edit/:id", createLimiter(50), verifyToken, itemController.editItem);

module.exports = router;