const mongoose = require("mongoose");

const otpCodeSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true }, 
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpCode", otpCodeSchema);