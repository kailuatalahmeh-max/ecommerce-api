import mongoose, { Document, Schema } from "mongoose";

export interface ICartItem {
  itemId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  guestId: string;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true },
);

CartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default mongoose.model<ICart>("Cart", CartSchema);