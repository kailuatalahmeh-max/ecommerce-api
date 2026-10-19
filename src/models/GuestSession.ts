import mongoose, { Schema, Document } from "mongoose";

export interface IGuestSession extends Document {
  phoneNumber: string;
  token: string;
  createdAt: Date;
}

const guestSessionSchema = new Schema<IGuestSession>({
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

export default mongoose.model<IGuestSession>(
  "GuestSession",
  guestSessionSchema,
);
