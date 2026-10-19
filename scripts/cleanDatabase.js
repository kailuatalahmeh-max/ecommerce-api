require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const Item = require("../src/models/Item").default;

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
