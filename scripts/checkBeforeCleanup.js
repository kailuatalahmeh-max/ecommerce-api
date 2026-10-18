require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const Item = require("../src/models/Item");

async function checkBeforeCleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const items = await Item.find({}).lean();

    console.log("عدد المنتجات:", items.length);
    console.log("--------------------------------");

    let safeToClean = true;

    for (const item of items) {
      const hasLegacyImageURL = Object.prototype.hasOwnProperty.call(
        item,
        "imageURL",
      );

      const hasImages = Array.isArray(item.images) && item.images.length > 0;

      console.log({
        id: item._id.toString(),
        name: item.itemName,
        hasLegacyImageURL,
        hasImages,
        imagesCount: item.images?.length ?? 0,
      });

      if (!hasImages) {
        safeToClean = false;
      }
    }

    console.log("--------------------------------");

    if (safeToClean) {
      console.log("✅ جميع المنتجات لديها images. قاعدة البيانات جاهزة للتنظيف.");
    } else {
      console.log("❌ يوجد منتج بدون images. لا تحذف imageURL بعد.");
    }
  } catch (error) {
    console.error("خطأ:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkBeforeCleanup();