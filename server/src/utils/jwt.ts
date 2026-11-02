
import jwt, { type SignOptions } from "jsonwebtoken";
import mongoose from "mongoose";
import type { UserRole } from "../models/User";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to a secret of at least 32 characters."
    );
  }

  return secret;
};

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

const isUserRole = (role: unknown): role is UserRole =>
  role === "ADMIN" || role === "MEMBER";

export const createToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: "1d",
  };

  return jwt.sign(payload, getJwtSecret(), options);
};

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    !mongoose.isValidObjectId(decoded.userId) ||
    !isUserRole(decoded.role)
  ) {
    throw new Error("Invalid token payload.");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
};
