const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    imageURL: { type: String, required: true },
  },
  { _id: false },
);

const itemSchema = new mongoose.Schema(
  {
    imageURL: { type: String, default: "" },
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

itemSchema.virtual("imageURL_virtual").get(function () {
  if (this.images && this.images.length > 0) {
    return this.images[0].imageURL;
  }
  return this.imageURL;
});

module.exports = mongoose.model("Item", itemSchema);
