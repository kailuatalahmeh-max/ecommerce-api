import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";

dotenv.config({
  path: ".env.testing",
  override: true,
});

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectTestDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env.testing");
  }

  if (!process.env.MONGO_URI.includes("testingDataBase")) {
    throw new Error("Tests must use the testing database");
  }

  await mongoose.connect(process.env.MONGO_URI);

  if (mongoose.connection.name !== "testingDataBase") {
    await mongoose.disconnect();
    throw new Error("Tests must use the testing database");
  }
};

export const disconnectTestDB = async () => {
  await mongoose.disconnect();
};
