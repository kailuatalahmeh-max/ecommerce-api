const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI;
    await mongoose.connect(dbURI);
    console.log("تم الاتصال بقاعدة بيانات تلاحمة بنجاح");
  } catch (err) {
    console.error("خطأ في الاتصال بقاعدة البيانات:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
