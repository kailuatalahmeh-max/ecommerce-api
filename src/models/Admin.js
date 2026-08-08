const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ["admin", "moderator", "super_admin"],
    default: "admin",
  },
});

module.exports = mongoose.model("Admin", adminSchema);
