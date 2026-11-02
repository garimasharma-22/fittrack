
import { Schema, model, Types } from "mongoose";


function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}


export interface ICompletedExercise {
  exerciseName: string;
  completedSets?: number;
  repetitions?: number;
  weightKg?: number;
  durationMinutes?: number;
  notes?: string;
}

export interface IWorkoutProgress {
  memberId: Types.ObjectId;
  assignmentId: Types.ObjectId;
  workoutPlanId: Types.ObjectId;
  completedAt: Date;
  exercises: ICompletedExercise[];
  overallNotes?: string;
}

const completedExerciseSchema = new Schema<ICompletedExercise>(
  {
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },

    completedSets: {
    type: Number,
    min: 0,
    validate: {
        validator: isNonNegativeInteger,
        message: "Completed sets must be a non-negative whole number",
    },
    },


    repetitions: {
    type: Number,
    min: 0,
    validate: {
        validator: isNonNegativeInteger,
        message: "Repetitions must be a non-negative whole number",
    },
    },

    weightKg: {
      type: Number,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
);

const workoutProgressSchema = new Schema<IWorkoutProgress>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutAssignment",
      required: true,
      index: true,
    },
    workoutPlanId: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutPlan",
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    exercises: {
      type: [completedExerciseSchema],
      required: true,
      validate: {
        validator: (exercises: ICompletedExercise[]) =>
          exercises.length > 0,
        message: "At least one completed exercise is required",
      },
    },
    overallNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

export default model<IWorkoutProgress>(
  "WorkoutProgress",
  workoutProgressSchema
);
