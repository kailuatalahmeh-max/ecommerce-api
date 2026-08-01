// createSuperAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./models/Admin");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const email = "admin@talahmeh.com";

  const thisAdmin = await Admin.findOne({ email });

  if (thisAdmin) {
    console.log("البريد الألكتروني مسجل بالفعل!");
    await mongoose.disconnect();

    return;
  }

  const hashedPassword = await bcrypt.hash("hammowdi", 10);
  await Admin.create({
    fullName: "المدير العام",
    email: email,
    password: hashedPassword,
    role: "super_admin",
  });
  console.log("تم إنشاء السوبر أدمن!");
  await mongoose.disconnect();
});
