require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Admin = require("../src/models/Admin");

async function updateAdminsLastActivity() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result_1 = await Admin.collection.updateMany(
      { lastActivityAt: { $exists: false } },
      { $set: { lastActivityAt: null } },
    );
    console.log("تحديث lastActivityAt:", result_1.modifiedCount);

    const result_2 = await Admin.collection.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } },
    );

    const result_3 = await Admin.collection.updateMany(
      {
        firstName: { $exists: false },
        fullName: { $exists: true, $ne: null },
      },
      [
        {
          $set: {
            firstName: {
              $arrayElemAt: [{ $split: ["$fullName", " "] }, 0],
            },
          },
        },
      ],
    );

    console.log("تحديث firstName:", result_3.modifiedCount);
  } catch (error) {
    console.error("خطأ أثناء تحديث lastActivityAt للأدمن:", error);
  } finally {
    await mongoose.disconnect();
  }
}

updateAdminsLastActivity();
