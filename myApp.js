require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const { createLimiter } = require("./src/middlewares/rateLimiter");

// استيراد الـ Routes
const adminRoutes = require("./src/routes/adminRoutes");
const itemRoutes = require("./src/routes/itemRoutes");
const cartRoutes = require("./src/routes/cartRoutes");
const orderRoutes = require("./src/routes/orderRoutes");

const app = express();

// الاتصال بقاعدة البيانات
connectDB();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "15kb" }));

app.use((req, res, next) => {
  console.log(req.ip, req.method, req.path);
  next();
});

// إعداد الـ Routes
app.use("/", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api", orderRoutes);

// Health check
app.get("/health", createLimiter(1000), (req, res) => {
  return res.status(200).json({ status: "ok" });
});

module.exports = app;
