const mongoose = require("mongoose");

const ConfirmationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    status: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "confirmed", "expired"],
    },
    expiresAt: { type: Date, required: true },
    confirmedAt: { type: Date },
    method: { type: String, enum: ["whatsapp_bot", "manual"] },
  },
  { _id: false },
);

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
    confirmation: { type: ConfirmationSchema },
    // Set when the customer cancels the order (POST /api/orders/cancel)
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["customer"] },
  },
  { timestamps: true },
);

OrderSchema.index({ phoneNumber: 1, createdAt: -1 });

OrderSchema.index({ "confirmation.code": 1 }, { unique: true, sparse: true });

OrderSchema.index({ "confirmation.status": 1, "confirmation.expiresAt": 1 });

module.exports = mongoose.model("Order", OrderSchema);
