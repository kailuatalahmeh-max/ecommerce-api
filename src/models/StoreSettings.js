const mongoose = require("mongoose");
const { normalizePhone } = require("../utils/phone");

const StoreSettingsSchema = new mongoose.Schema(
  {
    // مفتاح ثابت: يضمن إنه في مستند إعدادات واحد بس للمتجر كله
    key: {
      type: String,
      default: "main",
      unique: true,
      immutable: true,
    },

    // رقم واتساب المتجر بنفس صيغة normalizePhone، مثل: +970599123456
    whatsappNumber: {
      type: String,
      trim: true,
      set: (value) => normalizePhone(value) ?? value,
      validate: {
        validator: (value) => normalizePhone(value) === value,
        message: "رقم واتساب المتجر غير صحيح",
      },
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StoreSettings", StoreSettingsSchema);