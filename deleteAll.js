// updateItems.js
require("dotenv").config();
const mongoose = require("mongoose");
const Item = require("./models/Item");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Item.deleteMany({});

  console.log("تم حذف جميع الأصناف!");
  mongoose.disconnect();
});
