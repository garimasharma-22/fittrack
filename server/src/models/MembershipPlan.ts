
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMembershipPlan extends Document {
  name: string;
  description: string;
  durationDays: number;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: 3650,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

membershipPlanSchema.index({ isActive: 1, name: 1 });

const MembershipPlan: Model<IMembershipPlan> =
  mongoose.models.MembershipPlan ||
  mongoose.model<IMembershipPlan>(
    "MembershipPlan",
    membershipPlanSchema
  );

export default MembershipPlan;
