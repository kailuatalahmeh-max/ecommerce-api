require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");

const Item = require("../src/models/Item").default;


async function checkLegacyImageURL() {
  try {
    console.log("بدأ فحص العناصر!");

    await mongoose.connect(process.env.MONGO_URI);

    const items = await Item.find({}).lean();

    console.log("عدد المنتجات:", items.length);
    console.log("--------------------------------");

    for (const item of items) {
      console.log({
        id: item._id.toString(),
        name: item.itemName,
        hasLegacyImageURL: Object.prototype.hasOwnProperty.call(
          item,
          "imageURL",
        ),
        legacyImageURL: item.imageURL,
        imagesCount: item.images?.length ?? 0,
        images: item.images,
      });
    }

    console.log("--------------------------------");
    console.log("انتهى الفحص.");
  } catch (error) {
    console.error("خطأ:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLegacyImageURL();
