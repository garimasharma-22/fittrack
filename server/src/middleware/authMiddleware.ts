
import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../utils/jwt";
import User from "../models/User";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.fittrack_token;

  // 1. Require the authentication cookie.
  if (!token || typeof token !== "string") {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  // 2. Verify the JWT.
  let payload: ReturnType<typeof verifyToken>;

  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
    return;
  }

  // 3. Confirm the user still exists and is active.
  try {
    const user = await User.findById(payload.userId)
      .select("_id role isActive");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
      return;
    }

    // 4. Attach trusted user details to the request.
    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
