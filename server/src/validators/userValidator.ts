
import { z } from "zod";

// Rules for creating a member account
export const createMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((value) => value.toLowerCase()),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number cannot exceed 20 characters")
    .optional(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

// Rules for updating a member's profile
export const updateMemberSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .transform((value) => value.toLowerCase())
      .optional(),

    phone: z
      .string()
      .trim()
      .min(7, "Phone number must be at least 7 characters")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional(),

    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );
