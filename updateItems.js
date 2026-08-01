// updateItems.js
require("dotenv").config();
const mongoose = require("mongoose");
const Item = require("./models/Item");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Item.updateMany(
    { quantity: { $exists: false } }, // كل الأصناف اللي ما عندها quantity
    { $set: { quantity: 0 } }, // أضف quantity بقيمة 0
  );

  console.log("تم تحديث جميع الأصناف!");
  mongoose.disconnect();
});
