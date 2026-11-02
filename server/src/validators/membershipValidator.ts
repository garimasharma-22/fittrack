
import { z } from "zod";

export const createMembershipSchema = z.object({
  memberId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID"),

  planId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid membership plan ID"),

  startDate: z
    .coerce
    .date()
    .refine((date) => !Number.isNaN(date.getTime()), "Invalid start date")
    .optional(),
});

export const cancelMembershipSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
});


export const renewMembershipSchema = z.object({
  planId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid membership plan ID")
    .optional(),
});
