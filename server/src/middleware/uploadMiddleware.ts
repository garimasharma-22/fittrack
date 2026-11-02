
import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
    files: 1, // One image per request
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
  ) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new Error("Only JPEG, PNG, and WebP images are allowed.")
      );
      return;
    }

    callback(null, true);
  },
});

// Profile picture upload
export const uploadProfileImage = upload.single("profileImage");

// Workout image upload
export const uploadWorkoutImage = upload.single("workoutImage");

// Handle errors produced by the upload middleware.
// Mount this after the routes that use the upload middleware.
export function handleUploadError(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "Image size must not exceed 5 MB.",
      });
      return;
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({
        success: false,
        message: "Only one image can be uploaded per request.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "Image upload failed. Please check the uploaded file.",
    });
    return;
  }

  if (
    error instanceof Error &&
    error.message ===
      "Only JPEG, PNG, and WebP images are allowed."
  ) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  next(error);
}
