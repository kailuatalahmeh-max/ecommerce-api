require("dotenv").config();
const mongoose = require("mongoose");
const StoreSettings = require("../src/models/StoreSettings");

// الاستخدام:
//   node scripts/storeSettingsSeed.js +970599123456

async function run() {
  const whatsappNumber = process.argv[2];

  if (!whatsappNumber) {
    console.error("❌ اكتب رقم واتساب المتجر بعد اسم الملف");
    console.error("   مثال: node scripts/storeSettingsSeed.js +970599123456");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  // نجيب مستند الإعدادات أو ننشئ واحد جديد إذا مش موجود
  let settings = await StoreSettings.findOne({ key: "main" });
  if (!settings) {
    settings = new StoreSettings({ key: "main" });
  }

  settings.whatsappNumber = whatsappNumber;
  await settings.save(); // save() بتشغّل التنظيف (set) والفحص (validate)

  console.log(`✅ تم حفظ رقم واتساب المتجر: ${settings.whatsappNumber}`);
}

run()
  .catch((error) => {
    console.error("❌ فشل:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());