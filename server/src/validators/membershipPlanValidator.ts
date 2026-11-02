
import { z } from "zod";

export const createMembershipPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Plan name must be at least 2 characters")
    .max(100, "Plan name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(1000, "Description cannot exceed 1000 characters"),

  durationDays: z.coerce
    .number()
    .int("Duration must be a whole number of days")
    .min(1, "Duration must be at least 1 day")
    .max(3650, "Duration cannot exceed 3650 days"),

  price: z.coerce
    .number()
    .finite("Price must be a finite number")
    .min(0, "Price cannot be negative"),
});

export const updateMembershipPlanSchema =
  createMembershipPlanSchema
    .partial()
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field must be provided"
    );
