const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    imageURL: { type: String, required: true },
  },
  { _id: false },
);

const itemSchema = new mongoose.Schema(
  {
    images: {
      type: [imageSubSchema],
      default: [],
    },
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true, min: 0 },
    itemQuantity: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

module.exports = mongoose.model("Item", itemSchema);
