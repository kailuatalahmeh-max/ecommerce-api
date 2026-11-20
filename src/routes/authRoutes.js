const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { createLimiter } = require("../middlewares/rateLimiter");

// Mounted at /api/auth
router.post("/login", createLimiter(10), adminController.loginAdmin);

module.exports = router;
