
import type { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Do not attempt to send a second response.
  if (res.headersSent) {
    return;
  }

  // Handle MongoDB duplicate-key errors.
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
    return;
  }

  // Log the full error on the server, not in the client response.
  console.error("Unhandled application error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};
