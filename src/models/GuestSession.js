const mongoose = require("mongoose");

const guestSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30, 
  },
});

module.exports = mongoose.model("GuestSession", guestSessionSchema);
