
import { Schema, model, Types } from "mongoose";

export type WorkoutDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED";

export interface IExercise {
  name: string;
  description?: string;
  sets?: number;
  repetitions?: number;
  durationMinutes?: number;
  restSeconds?: number;
}

export interface IWorkoutPlan {
  name: string;
  description?: string;
  difficulty: WorkoutDifficulty;
  exercises: IExercise[];
  imageUrl?: string;
  createdBy: Types.ObjectId;
  isActive: boolean;
  imagePublicId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    sets: {
      type: Number,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Sets must be a whole number",
      },
    },
    repetitions: {
      type: Number,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Repetitions must be a whole number",
      },
    },
    durationMinutes: {
      type: Number,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Duration must be a whole number",
      },
    },
    restSeconds: {
      type: Number,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Rest seconds must be a whole number",
      },
    },
  },
  { _id: false }
);

const workoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    difficulty: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      required: true,
    },
    exercises: {
      type: [exerciseSchema],
      required: true,
      validate: {
        validator: (exercises: IExercise[]) =>
          exercises.length > 0,
        message: "At least one exercise is required",
      },
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

workoutPlanSchema.index({ isActive: 1, difficulty: 1 });

export default model<IWorkoutPlan>(
  "WorkoutPlan",
  workoutPlanSchema
);
