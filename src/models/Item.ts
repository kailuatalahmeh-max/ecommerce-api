import mongoose, { Schema, Document } from "mongoose";

interface IImage {
  imageURL: string;
}

export interface IItem extends Document {
  images: IImage[];
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const imageSubSchema = new Schema<IImage>(
  {
    imageURL: { type: String, required: true },
  },
  { _id: false },
);

const itemSchema = new Schema<IItem>(
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

export default mongoose.model<IItem>("Item", itemSchema);
