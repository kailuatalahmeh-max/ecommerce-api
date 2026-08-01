const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    imageURL: { type: String, default: "" },
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    itemQuantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Item", itemSchema);
