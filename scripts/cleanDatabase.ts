import dotenv from "dotenv";
import mongoose from "mongoose";
import Item from "../src/models/Item";

dotenv.config({ path: "../.env" });

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Item.collection.updateMany(
      { imageURL: { $exists: true } },
      { $unset: { imageURL: "" } },
    );

    console.log("تم تنظيف قاعدة البيانات.");
    console.log("الوثائق المطابقة:", result.matchedCount);
    console.log("الوثائق المعدلة:", result.modifiedCount);
  } catch (error) {
    console.error("خطأ أثناء تنظيف قاعدة البيانات:", error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanDatabase();
