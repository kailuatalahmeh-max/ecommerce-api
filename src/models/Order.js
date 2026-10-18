const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    region: { type: String, required: true },
    items: {
      type: [
        {
          itemName: { type: String, required: true },
          itemPrice: { type: Number, required: true },
          quantity: { type: Number, required: true },
          itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        },
      ],
      required: true,
    },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      default: "Pending",
      enum: ["Pending", "Accepted", "Delivered", "Cancelled"],
    },
  },
  { timestamps: true },
);

OrderSchema.index({ phoneNumber: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
