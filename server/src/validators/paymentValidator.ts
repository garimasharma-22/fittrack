
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

export const createPaymentSchema = z.object({
  membershipId: objectIdSchema,

  amount: z.coerce
    .number()
    .finite("Amount must be a valid number")
    .positive("Amount must be greater than zero"),

  paymentDate: z.coerce
    .date()
    .optional(),

  paymentMethod: z.enum([
    "CASH",
    "UPI",
    "CARD",
    "BANK_TRANSFER",
    "OTHER",
  ]),

  reference: z
    .string()
    .trim()
    .max(100, "Reference cannot exceed 100 characters")
    .optional(),

  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
});

export const updatePaymentNotesSchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters"),
  });
