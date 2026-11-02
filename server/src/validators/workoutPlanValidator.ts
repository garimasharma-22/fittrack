
import { z } from "zod";

const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000).optional(),
    sets: z.number().int().min(1).optional(),
    repetitions: z.number().int().min(1).optional(),
    durationMinutes: z.number().int().min(1).optional(),
    restSeconds: z.number().int().min(0).optional(),
  })
  .strict();

export const createWorkoutPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).optional(),
    difficulty: z.enum([
      "BEGINNER",
      "INTERMEDIATE",
      "ADVANCED",
    ]),
    exercises: z.array(exerciseSchema).min(1),
  })
  .strict();

export const updateWorkoutPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    difficulty: z
      .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .optional(),
    exercises: z.array(exerciseSchema).min(1).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
