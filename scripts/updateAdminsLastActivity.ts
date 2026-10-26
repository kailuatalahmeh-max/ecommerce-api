import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "dns";
import Admin from "../src/models/Admin";

dotenv.config({ path: "../.env" });
dns.setServers(["8.8.8.8", "1.1.1.1"]);


async function updateAdminsLastActivity() {
  try {
    await mongoose.connect(process.env.MONGO_URI2);

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
