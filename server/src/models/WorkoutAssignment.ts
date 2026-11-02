
import { Schema, model, Types } from "mongoose";

export type WorkoutAssignmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface IWorkoutAssignment {
  memberId: Types.ObjectId;
  workoutPlanId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  status: WorkoutAssignmentStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const workoutAssignmentSchema = new Schema<IWorkoutAssignment>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workoutPlanId: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutPlan",
      required: true,
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: (value: Date) =>
          value instanceof Date && !Number.isNaN(value.getTime()),
        message: "Start date must be valid.",
      },
    },

    endDate: {
      type: Date,
      validate: {
        validator: function (this: any, value?: Date) {
          if (value === undefined || value === null) {
            return true;
          }

          return (
            value instanceof Date &&
            !Number.isNaN(value.getTime()) &&
            value >= this.startDate
          );
        },
        message: "End date must be valid and on or after the start date.",
      },
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

workoutAssignmentSchema.index({ memberId: 1, status: 1 });
workoutAssignmentSchema.index({ workoutPlanId: 1, status: 1 });

export default model<IWorkoutAssignment>(
  "WorkoutAssignment",
  workoutAssignmentSchema
);
