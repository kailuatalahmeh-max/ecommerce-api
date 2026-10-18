const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, "الاسم الكامل مطلوب"] },
    firstName: {
      type: String,
      default: "user",
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      select: false,
    },
    role: {
      type: String,
      required: [true, "الرتبة مطلوبة"],
      enum: {
        values: ["admin", "moderator", "super_admin"],
        message: "الصلاحية المحددة غير صالحة",
      },
      default: "admin",
    },
    isActive: { type: Boolean, default: true },
    lastActivityAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

adminSchema.pre("save", function () {
  if (this.fullName) {
    this.firstName = this.fullName.split(" ")[0];
  }
});

module.exports = mongoose.model("Admin", adminSchema);
