require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createLimiter } = require("./src/middlewares/rateLimiter");
const errorHandler = require("./src/middlewares/errorMiddleware").default;

const adminRoutes = require("./src/routes/adminRoutes");
const itemRoutes = require("./src/routes/itemRoutes");
const cartRoutes = require("./src/routes/cartRoutes");
const orderRoutes = require("./src/routes/orderRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const startTime = new Date();

    res.on("finish", () => {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

      const status = res.statusCode;

      const log = {
        time: startTime.toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        status,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: req.get("user-agent"),
        referer: req.get("referer") || null,
        contentLength: res.get("content-length") || null,
      };

      if (status >= 500) {
        console.error("🔥 SERVER ERROR", log);
      } else if (status >= 400) {
        console.warn("⚠️ CLIENT ERROR", log);
      } else {
        console.log("✅ REQUEST", log);
      }
    });

    next();
  });
}
app.use("/api", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api", orderRoutes);

app.get("/health", createLimiter(1000), (req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.use(errorHandler);

module.exports = app;
