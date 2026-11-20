/*
  بيانات متجر "Talahmeh Phones": هواتف وإكسسوارات (22 منتج).
  قاعدة البيانات: MONGO_URI2

  التشغيل (من داخل مجلد backend):
    node scripts/seedPhoneShop.js --dry-run    ← يعرض فقط (لا يكتب ولا يحذف شيئاً)
    node scripts/seedPhoneShop.js              ← يضيف المنتجات غير الموجودة فقط
    node scripts/seedPhoneShop.js --replace    ← نسخة احتياطية للمنتجات، ثم حذف كل المنتجات، ثم إضافة الجديدة

  - --replace يحذف مجموعة items فقط (الطلبات، السلات، الأدمن لا تتأثر).
  - النسخة الاحتياطية تُحفظ في backend/backups/ (ملف JSON، غير موجود في git).
  - الصور من Unsplash (تم التأكد أنها تعمل وأنها تطابق المنتج).
*/
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Item = require("../src/models/Item");
const { ITEM_LIMITS } = require("../src/utils/constants");

const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");
const BACKUP_DIR = path.join(__dirname, "..", "backups");

const img = (id) => ({
  imageURL: `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`,
});

const ITEMS = [
  // ===== هواتف =====
  {
    itemName: "iPhone 15 Pro 256GB - تيتانيوم طبيعي",
    itemPrice: 1099,
    itemQuantity: 6,
    images: [img("1678685888221-cda773a3dcdb")],
  },
  {
    itemName: "iPhone 14 Pro 128GB - فضي",
    itemPrice: 899,
    itemQuantity: 4,
    images: [img("1592750475338-74b7b21085ab"), img("1663499482523-1c0c1bae4ce1")],
  },
  {
    itemName: "iPhone 13 Pro 128GB - أزرق سييرا",
    itemPrice: 699,
    itemQuantity: 5,
    images: [img("1632661674596-df8be070a5c5")],
  },
  {
    itemName: "iPhone 12 Pro 256GB",
    itemPrice: 549,
    itemQuantity: 3,
    images: [img("1604671368394-2240d0b1bb6c"), img("1592899677977-9c10ca588bbd")],
  },
  {
    itemName: "iPhone 12 128GB - أسود",
    itemPrice: 449,
    itemQuantity: 8,
    images: [img("1616348436168-de43ad0db179"), img("1605236453806-6ff36851218e")],
  },
  {
    itemName: "iPhone 11 128GB - أبيض",
    itemPrice: 349,
    itemQuantity: 10,
    images: [img("1591337676887-a217a6970a8a"), img("1585060544812-6b45742d762f")],
  },
  {
    itemName: "iPhone 11 Pro 64GB - مستعمل (حالة ممتازة)",
    itemPrice: 299,
    itemQuantity: 2,
    images: [img("1574944985070-8f3ebc6b79d2")],
  },
  {
    itemName: "Samsung Galaxy S21 Ultra 256GB - أسود",
    itemPrice: 599,
    itemQuantity: 5,
    images: [img("1610945415295-d9bbf067e59c"), img("1610792516307-ea5acd9c3b00")],
  },
  {
    itemName: "Samsung Galaxy S20 128GB",
    itemPrice: 329,
    itemQuantity: 0, // نفذت الكمية
    images: [img("1583573636246-18cb2246697f")],
  },
  {
    itemName: "Google Pixel 128GB",
    itemPrice: 449,
    itemQuantity: 4,
    images: [img("1598965402089-897ce52e8355")],
  },
  {
    itemName: "Xiaomi Redmi Note 128GB",
    itemPrice: 219,
    itemQuantity: 12,
    images: [img("1598327105666-5b89351aff97"), img("1609091839311-d5365f9ff1c5")],
  },

  // ===== سماعات =====
  {
    itemName: "AirPods Pro (الجيل الثاني)",
    itemPrice: 229,
    itemQuantity: 9,
    images: [
      img("1572569511254-d8f925fe2cbb"),
      img("1588423771073-b8903fbb85b5"),
      img("1606741965326-cb990ae01bb2"),
    ],
  },
  {
    itemName: "AirPods (الجيل الثاني)",
    itemPrice: 119,
    itemQuantity: 14,
    images: [img("1600294037681-c80b4cb5b434")],
  },
  {
    itemName: "سماعات لاسلكية داخل الأذن - أسود",
    itemPrice: 29,
    itemQuantity: 35,
    images: [img("1606220588913-b3aacb4d2f46")],
  },
  {
    itemName: "سماعات لاسلكية داخل الأذن - وردي",
    itemPrice: 25,
    itemQuantity: 20,
    images: [img("1627989580309-bfaf3e58af6f")],
  },
  {
    itemName: "سماعات Sony WH-1000XM4 عازلة للضوضاء",
    itemPrice: 279,
    itemQuantity: 5,
    images: [img("1618366712010-f4ae9c647dcb")],
  },

  // ===== شواحن وإكسسوارات =====
  {
    itemName: "شاحن سريع 20W USB-C مع كابل",
    itemPrice: 19,
    itemQuantity: 50,
    images: [img("1583863788434-e58a36330cf0")],
  },
  {
    itemName: "شاحن MagSafe لاسلكي 15W",
    itemPrice: 35,
    itemQuantity: 18,
    images: [img("1615526675159-e248c3021d3f")],
  },
  {
    itemName: "كفر حماية كربون - أسود",
    itemPrice: 9.99,
    itemQuantity: 60,
    images: [img("1601593346740-925612772716")],
  },

  // ===== ساعات وتابلت =====
  {
    itemName: "Apple Watch Series 9 - 45mm",
    itemPrice: 399,
    itemQuantity: 4,
    images: [img("1546868871-7041f2a55e12")],
  },
  {
    itemName: "Apple Watch SE - 44mm",
    itemPrice: 249,
    itemQuantity: 6,
    images: [img("1631281956016-3cdc1b2fe5fb")],
  },
  {
    itemName: "iPad 10.9 إنش 64GB",
    itemPrice: 449,
    itemQuantity: 7,
    images: [img("1561154464-82e9adf32764"), img("1544244015-0df4b3ffc6b0")],
  },
];

// نفس حدود الـ API
function checkLimits(item) {
  const errors = [];
  if (item.itemName.length > ITEM_LIMITS.MAX_NAME_LENGTH) errors.push("name too long");
  if (item.itemPrice < 0 || item.itemPrice > ITEM_LIMITS.MAX_PRICE) errors.push("bad price");
  if (item.itemQuantity < 0 || item.itemQuantity > ITEM_LIMITS.MAX_QUANTITY) errors.push("bad quantity");
  if (item.images.length < 1 || item.images.length > ITEM_LIMITS.MAX_IMAGES_PER_ITEM) errors.push("bad images count");
  return errors;
}

// نسخة احتياطية لكل المنتجات الحالية (EJSON يحفظ ObjectId والتواريخ بشكل صحيح)
async function backupItems(dbName) {
  const items = await Item.collection.find({}).toArray();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `items-${dbName}-${stamp}.json`);
  fs.writeFileSync(file, mongoose.mongo.BSON.EJSON.stringify(items, null, 2, { relaxed: false }));

  // نتأكد أن الملف مكتوب وعدد المنتجات صحيح قبل الحذف
  const check = mongoose.mongo.BSON.EJSON.parse(fs.readFileSync(file, "utf8"));
  if (check.length !== items.length) {
    throw new Error("Backup check failed: count does not match");
  }
  return { file, count: items.length };
}

async function seedPhoneShop() {
  const uri = process.env.MONGO_URI2;
  if (!uri) {
    console.error("❌ MONGO_URI2 غير موجود في ملف .env");
    process.exit(1);
  }

  for (const item of ITEMS) {
    const errors = checkLimits(item);
    if (errors.length > 0) {
      console.error(`❌ "${item.itemName}": ${errors.join(", ")}`);
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(uri);
    const { name, host } = mongoose.connection;
    console.log(`📦 Database: ${name} @ ${host}`);
    const currentCount = await Item.countDocuments();
    console.log(`   المنتجات الحالية: ${currentCount}`);
    console.log(
      `   الوضع: ${DRY_RUN ? "dry run (لا تغيير)" : REPLACE ? "replace (نسخ + حذف + إضافة)" : "add (إضافة فقط)"}\n`,
    );

    if (DRY_RUN) {
      if (REPLACE) console.log(`سيتم حذف ${currentCount} منتج بعد أخذ نسخة احتياطية.`);
      ITEMS.forEach((i) => console.log(`➕ ${i.itemName} — ${i.itemPrice}$ × ${i.itemQuantity}`));
      console.log(`\nسيتم إضافة: ${ITEMS.length}`);
      return;
    }

    if (REPLACE) {
      const backup = await backupItems(name);
      console.log(`💾 نسخة احتياطية: ${backup.count} منتج ← ${backup.file}`);
      const deleted = await Item.deleteMany({});
      console.log(`🗑️  تم حذف ${deleted.deletedCount} منتج`);
    }

    const existing = await Item.find({ itemName: { $in: ITEMS.map((i) => i.itemName) } })
      .select("itemName")
      .lean();
    const existingNames = new Set(existing.map((i) => i.itemName));
    const toAdd = ITEMS.filter((i) => !existingNames.has(i.itemName));

    if (toAdd.length > 0) {
      const result = await Item.insertMany(toAdd);
      console.log(`✅ تمت إضافة ${result.length} منتج`);
    }
    if (existingNames.size > 0) {
      console.log(`⏭️  موجود مسبقاً (لم يُضف): ${existingNames.size}`);
    }
    console.log(`📊 عدد المنتجات الآن: ${await Item.countDocuments()}`);
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedPhoneShop();
