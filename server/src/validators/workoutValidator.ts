
import { z } from "zod";

const exerciseSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Exercise name must be at least 2 characters")
    .max(100, "Exercise name cannot exceed 100 characters"),

  description: z.string()
    .trim()
    .max(500, "Exercise description cannot exceed 500 characters")
    .optional(),

  sets: z.coerce.number().int().min(1).max(100).optional(),
  repetitions: z.coerce.number().int().min(1).max(1000).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  restSeconds: z.coerce.number().int().min(0).max(3600).optional(),
});

export const createWorkoutPlanSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Workout name must be at least 2 characters")
    .max(100),

  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(2000),

  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),

  exercises: z.array(exerciseSchema)
    .min(1, "Add at least one exercise")
    .max(100, "A plan cannot contain more than 100 exercises"),

  imageUrl: z.string().url().optional(),
  imagePublicId: z.string().trim().optional(),
});

export const updateWorkoutPlanSchema = createWorkoutPlanSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update"
  );
