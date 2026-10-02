// scanInvisibleChars.js
// سكربت فحص فقط — لا يعدّل أي بيانات، فقط يطبع النتائج
require("dotenv").config();
const mongoose = require("mongoose");

const Admin = require("../src/models/Admin");
const Cart = require("../src/models/Cart");
const Item = require("../src/models/Item");
const Order = require("../src/models/Order");

const INVISIBLE_UNICODE_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/;

function hasInvisibleChars(value) {
  return typeof value === "string" && INVISIBLE_UNICODE_REGEX.test(value);
}

// يفحص كل الحقول النصية بمستوى واحد (وداخل عناصر المصفوفات لو موجودة)
function findAffectedFields(doc, prefix = "") {
  const affected = [];

  for (const key in doc) {
    if (key === "_id" || key === "__v") continue;
    const value = doc[key];
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      if (hasInvisibleChars(value)) {
        affected.push({ field: fieldPath, value });
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") {
          affected.push(...findAffectedFields(item, `${fieldPath}[${index}]`));
        } else if (typeof item === "string" && hasInvisibleChars(item)) {
          affected.push({ field: `${fieldPath}[${index}]`, value: item });
        }
      });
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      affected.push(...findAffectedFields(value, fieldPath));
    }
  }

  return affected;
}

async function scanCollection(name, Model) {
  const docs = await Model.find({}).lean();
  let totalAffected = 0;

  console.log(`\n📂 فحص ${name} (${docs.length} مستند)...`);

  for (const doc of docs) {
    const affectedFields = findAffectedFields(doc);
    if (affectedFields.length > 0) {
      totalAffected++;
      console.log(`  ⚠️  _id: ${doc._id}`);
      affectedFields.forEach(({ field, value }) => {
        console.log(`      - ${field}: ${JSON.stringify(value)}`);
      });
    }
  }

  console.log(`  ✅ عدد المستندات المتأثرة بـ ${name}: ${totalAffected}`);
  return totalAffected;
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("🔍 بدء فحص رموز اليونيكود الخفية (فحص فقط، بدون أي تعديل)...");

  const results = {};
  results.Admin = await scanCollection("Admin", Admin);
  results.Cart = await scanCollection("Cart", Cart);
  results.Item = await scanCollection("Item", Item);
  results.Order = await scanCollection("Order", Order);

  console.log("\n📊 الملخص النهائي:");
  console.log(results);

  await mongoose.disconnect();
});
