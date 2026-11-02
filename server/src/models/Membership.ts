
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MembershipStatus =
  | "UPCOMING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

export interface IMembership extends Document {
  memberId: Types.ObjectId;
  planId: Types.ObjectId;
  startDate: Date;
  expiryDate: Date;
  priceCharged: number;
  status: MembershipStatus;
  assignedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    priceCharged: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["UPCOMING", "ACTIVE", "EXPIRED", "CANCELLED"],
      required: true,
      default: "UPCOMING",
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Useful for finding a member's memberships
membershipSchema.index({ memberId: 1, status: 1 });

// Useful for finding memberships nearing expiry
membershipSchema.index({ status: 1, expiryDate: 1 });

const Membership: Model<IMembership> =
  mongoose.models.Membership ||
  mongoose.model<IMembership>("Membership", membershipSchema);

export default Membership;
