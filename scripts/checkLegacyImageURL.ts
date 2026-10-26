import dotenv from "dotenv";
import mongoose from "mongoose";
import Item, { IItem } from "../src/models/Item";

dotenv.config({ path: "../.env" });

// The old "imageURL" field is not in IItem anymore, but old documents may still have it
type LegacyItem = IItem & { imageURL?: string };

async function checkLegacyImageURL() {
  try {
    console.log("بدأ فحص العناصر!");

    await mongoose.connect(process.env.MONGO_URI);

    const items = await Item.find({}).lean<LegacyItem[]>();

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
