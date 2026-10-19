import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem {
  itemName: string;
  itemPrice: number;
  quantity: number;
  itemId: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
  customerName: string;
  phoneNumber: string;
  region: string;
  items: IOrderItem[];
  totalPrice: number;
  status: "Pending" | "Accepted" | "Delivered" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
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

export default mongoose.model<IOrder>("Order", OrderSchema);