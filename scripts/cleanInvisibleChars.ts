// cleanInvisibleChars.ts
// سكربت تنظيف محارف Unicode الخفية.
// الوضع الافتراضي: DRY RUN — يعرض التغييرات بدون تعديل قاعدة البيانات.
//
// للتنفيذ الفعلي:
// DRY_RUN=false npx tsx scripts/cleanInvisibleChars.ts

import "dotenv/config";
import mongoose from "mongoose";

import Admin from "../src/models/Admin";
import Cart from "../src/models/Cart";
import Item from "../src/models/Item";
import Order from "../src/models/Order";

// محارف Unicode الخفية / التحكمية التي نريد إزالتها.
const INVISIBLE_UNICODE_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

const DRY_RUN = process.env.DRY_RUN !== "false";

type FieldChange = {
  field: string;
  before: string;
  after: string;
};

type CollectionResult = {
  affectedDocuments: number;
  affectedFields: number;
  modifiedDocuments: number;
};

function stripInvisibleChars(value: any) {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(INVISIBLE_UNICODE_REGEX, "");
}

function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function cleanValue(value: any): any {
  if (typeof value === "string") {
    return stripInvisibleChars(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item));
  }

  if (isPlainObject(value)) {
    const cleaned: Record<string, any> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "_id" || key === "__v") {
        cleaned[key] = nestedValue;
        continue;
      }

      cleaned[key] = cleanValue(nestedValue);
    }

    return cleaned;
  }

  // ObjectId, Date, Decimal128, etc.
  // نرجعها كما هي بدون تغيير.
  return value;
}

function valuesAreDifferent(original: any, cleaned: any): boolean {
  return JSON.stringify(original) !== JSON.stringify(cleaned);
}

function findChanges(original: any, cleaned: any, prefix = ""): FieldChange[] {
  const changes: FieldChange[] = [];

  if (typeof original === "string" && typeof cleaned === "string") {
    if (original !== cleaned) {
      changes.push({
        field: prefix,
        before: original,
        after: cleaned,
      });
    }

    return changes;
  }

  if (Array.isArray(original) && Array.isArray(cleaned)) {
    original.forEach((item, index) => {
      changes.push(...findChanges(item, cleaned[index], `${prefix}[${index}]`));
    });

    return changes;
  }

  if (isPlainObject(original) && isPlainObject(cleaned)) {
    for (const key of Object.keys(original)) {
      if (key === "_id" || key === "__v") {
        continue;
      }

      const fieldPath = prefix ? `${prefix}.${key}` : key;

      changes.push(...findChanges(original[key], cleaned[key], fieldPath));
    }
  }

  return changes;
}

async function cleanCollection(
  name: string,
  Model: mongoose.Model<any>,
): Promise<CollectionResult> {
  const docs = await Model.find({}).lean();

  let affectedDocuments = 0;
  let modifiedDocuments = 0;
  let affectedFields = 0;

  console.log(`\n📂 فحص ${name} (${docs.length} مستند)...`);

  for (const doc of docs) {
    const cleanedDoc = cleanValue(doc);

    if (!valuesAreDifferent(doc, cleanedDoc)) {
      continue;
    }

    const changes = findChanges(doc, cleanedDoc);

    affectedDocuments++;
    affectedFields += changes.length;

    console.log(`\n  ⚠️ المستند المتأثر: ${doc._id}`);

    changes.forEach(({ field, before, after }) => {
      console.log(`      - ${field}`);
      console.log(`        قبل: ${JSON.stringify(before)}`);
      console.log(`        بعد: ${JSON.stringify(after)}`);
    });

    if (DRY_RUN) {
      continue;
    }

    // نستخدم $set على الحقول التي تغيرت فقط.
    const update: Record<string, string> = {};

    changes.forEach(({ field, after }) => {
      // تحويل paths مثل items[0].itemName إلى
      // items.0.itemName حتى يفهمها MongoDB بشكل صحيح.
      const mongoPath = field.replace(/\[(\d+)\]/g, ".$1");

      update[mongoPath] = after;
    });

    const result = await Model.updateOne({ _id: doc._id }, { $set: update });

    if (result.modifiedCount === 1) {
      modifiedDocuments++;
    }
  }

  console.log(`\n  📊 ${name}: ${affectedDocuments} مستند متأثر`);

  console.log(`  📝 ${name}: ${affectedFields} حقل يحتاج تنظيف`);

  if (DRY_RUN) {
    console.log(`  🟡 ${name}: DRY RUN — لم يتم تعديل أي بيانات`);
  } else {
    console.log(`  ✅ ${name}: تم تعديل ${modifiedDocuments} مستند`);
  }

  return {
    affectedDocuments,
    affectedFields,
    modifiedDocuments,
  };
}

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI غير موجود في ملف .env");
    }

    console.log("🔌 الاتصال بقاعدة البيانات...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ تم الاتصال بقاعدة البيانات.");

    console.log(
      DRY_RUN
        ? "\n🔍 الوضع الحالي: DRY RUN — فحص فقط، بدون تعديل."
        : "\n⚠️ الوضع الحالي: LIVE — سيتم تعديل البيانات.",
    );

    const results: Record<string, CollectionResult> = {};

    results.Admin = await cleanCollection("Admin", Admin);

    results.Cart = await cleanCollection("Cart", Cart);

    results.Item = await cleanCollection("Item", Item);

    results.Order = await cleanCollection("Order", Order);

    console.log("\n📊 الملخص النهائي:");

    console.table(results);

    const totalAffected = Object.values(results).reduce(
      (total, result) => total + result.affectedDocuments,
      0,
    );

    const totalModified = Object.values(results).reduce(
      (total, result) => total + result.modifiedDocuments,
      0,
    );

    console.log(`\n📌 إجمالي المستندات المتأثرة: ${totalAffected}`);

    if (!DRY_RUN) {
      console.log(`✅ إجمالي المستندات المعدلة: ${totalModified}`);
    }

    console.log("\n🏁 انتهى السكربت بنجاح.");
  } catch (error) {
    console.error("\n❌ حدث خطأ:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 تم إغلاق اتصال قاعدة البيانات.");
  }
}

main();
