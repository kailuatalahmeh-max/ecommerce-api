require("dotenv").config();
const app = require("./myApp");
const connectDB = require("./src/config/db");
const { startExpireOrdersJob } = require("./src/services/expireOrders.service");

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "FRONTEND_URL"];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Node is listening on port ${PORT}...`);
  });
  // Not confirmed in 24 hours → cancelled, and the stock comes back
  startExpireOrdersJob();
});
