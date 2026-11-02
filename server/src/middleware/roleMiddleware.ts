
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../models/User";

export const allowRoles =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // Check whether the user is authenticated.
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Check whether the user's role is permitted.
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    // Allow the request to continue.
    next();
  };