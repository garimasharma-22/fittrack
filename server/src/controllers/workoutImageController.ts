
import { Request, Response } from "express";
import mongoose from "mongoose";

import cloudinary from "../config/cloudinary";
import WorkoutPlan from "../models/WorkoutPlan";

function uploadToCloudinary(
  fileBuffer: Buffer
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "fittrack/workout-images",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
}

export async function uploadWorkoutPlanImage(
  req: Request,
  res: Response
): Promise<void> {
  let newPublicId: string | undefined;
  let databaseSaveSucceeded = false;

  try {
    const { id } = req.params;

    // Validate the workout plan ID.
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan ID.",
      });
      return;
    }

    // Ensure an image was uploaded.
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please select a workout image.",
      });
      return;
    }

    // Find the workout plan.
    const workoutPlan = await WorkoutPlan.findById(id);

    if (!workoutPlan) {
      res.status(404).json({
        success: false,
        message: "Workout plan not found.",
      });
      return;
    }

    // Upload the new image to Cloudinary.
    const uploadedImage = await uploadToCloudinary(req.file.buffer);
    newPublicId = uploadedImage.public_id;

    // Keep the old image details until the database save succeeds.
    const oldPublicId = workoutPlan.imagePublicId;

    workoutPlan.imageUrl = uploadedImage.secure_url;
    workoutPlan.imagePublicId = uploadedImage.public_id;

    await workoutPlan.save();
    databaseSaveSucceeded = true;

    // Delete the previous image only after the new image is saved.
    if (oldPublicId && oldPublicId !== newPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (deleteError) {
        console.error(
          "Could not delete previous workout image:",
          deleteError
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Workout image uploaded successfully.",
      data: {
        workoutPlanId: workoutPlan._id,
        imageUrl: workoutPlan.imageUrl,
      },
    });
  } catch (error) {
    console.error("Workout image upload error:", error);

    // Clean up the new image only if the database save did not succeed.
    // If the save outcome is uncertain due to a network error, avoid
    // deleting an image that the database might already reference.
    if (newPublicId && !databaseSaveSucceeded) {
      try {
        await cloudinary.uploader.destroy(newPublicId);
      } catch (cleanupError) {
        console.error(
          "Could not clean up uploaded workout image:",
          cleanupError
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Unable to upload workout image.",
    });
  }
}
