
import { z } from "zod";

// Validate a new workout assignment
export const createWorkoutAssignmentSchema = z
  .object({
    memberId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid member ID"),

    workoutPlanId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid workout plan ID"),

    startDate: z.coerce.date(),

    endDate: z.coerce.date().optional(),

    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    }
  );

// Validate updates to an existing assignment
export const updateWorkoutAssignmentSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),

    endDate: z.coerce.date().optional(),

    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
