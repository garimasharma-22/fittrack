
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";

export interface IPayment extends Document {
  memberId: Types.ObjectId;
  membershipId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    membershipId: {
      type: Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"],
      required: true,
    },

    reference: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ memberId: 1, paymentDate: -1 });
paymentSchema.index({ membershipId: 1, paymentDate: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;
