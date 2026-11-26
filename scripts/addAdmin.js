// addAdmin.js: creates the first admin account (usually the super_admin).
//
// The email and password come from backend/.env (never from this file):
//   ADMIN_EMAIL=you@example.com
//   ADMIN_PASSWORD=a-strong-password      (8 to 72 characters)
//   ADMIN_FULL_NAME=المدير العام           (optional, more than 5 characters)
//   ADMIN_ROLE=super_admin                (optional: admin | moderator | super_admin)
//
// Run (from any folder):
//   node scripts/addAdmin.js
//
// After it works, remove ADMIN_PASSWORD from .env.
// Later admins can be added from the admin page "Create admin account".

const path = require("path");
// Always read backend/.env, from whatever folder you run the script
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../src/models/Admin");

// Same rules as POST /api/admins (adminController.createAdmin)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["admin", "moderator", "super_admin"];

function readInput() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  const fullName = String(process.env.ADMIN_FULL_NAME || "المدير العام").trim();
  const role = String(process.env.ADMIN_ROLE || "super_admin").trim();

  const errors = [];
  if (!process.env.MONGO_URI) errors.push("MONGO_URI غير موجود في .env");
  if (!email) errors.push("ADMIN_EMAIL غير موجود في .env");
  else if (!EMAIL_REGEX.test(email)) errors.push("ADMIN_EMAIL صيغته غير صحيحة");
  if (!password) errors.push("ADMIN_PASSWORD غير موجود في .env");
  else if (password.length < 8 || password.length > 72) {
    errors.push("ADMIN_PASSWORD يجب أن يكون بين 8 و72 حرف");
  }
  if (fullName.length <= 5) errors.push("ADMIN_FULL_NAME يجب أن يكون أكثر من 5 أحرف");
  if (!ALLOWED_ROLES.includes(role)) {
    errors.push(`ADMIN_ROLE غير صالح (المسموح: ${ALLOWED_ROLES.join(" | ")})`);
  }

  return { email, password, fullName, role, errors };
}

async function run() {
  const { email, password, fullName, role, errors } = readInput();

  if (errors.length > 0) {
    console.error("❌ لا يمكن إنشاء الأدمن:");
    for (const error of errors) console.error(`   - ${error}`);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    // Never change an existing account (its password stays the same)
    const existing = await Admin.findOne({ email }).lean();
    if (existing) {
      console.log(`ℹ️ البريد الإلكتروني مسجل بالفعل: ${email} (${existing.role}). لم يتغير شيء.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({ fullName, email, password: hashedPassword, role });

    // The password is never printed
    console.log(`✅ تم إنشاء الأدمن: ${email} (${role})`);
    console.log("   احذف ADMIN_PASSWORD من ملف .env الآن.");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("❌ فشل:", error.message);
  process.exitCode = 1;
});
