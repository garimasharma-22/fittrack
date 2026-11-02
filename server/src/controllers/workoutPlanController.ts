
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import WorkoutPlan from "../models/WorkoutPlan";

import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
} from "../validators/workoutPlanValidator";

// GET /api/workout-plans
// Admins can view all plans; members can view active plans only.
export const getWorkoutPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const filter =
      req.user.role === "ADMIN" ? {} : { isActive: true };

    const plans = await WorkoutPlan.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/workout-plans/:id
// Admins can view any plan; members can view active plans only.
export const getWorkoutPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan ID",
      });
      return;
    }

    const plan = await WorkoutPlan.findById(id).populate(
      "createdBy",
      "name email"
    );

    if (!plan || (!plan.isActive && req.user.role !== "ADMIN")) {
      res.status(404).json({
        success: false,
        message: "Workout plan not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/workout-plans
// Admin creates a workout plan.
export const createWorkoutPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (currentUser.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only admins can create workout plans",
      });
      return;
    }

    const validation = createWorkoutPlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan data",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    // Server controls the creator and initial active status.
    const plan = await WorkoutPlan.create({
      ...validation.data,
      createdBy: new mongoose.Types.ObjectId(currentUser.userId),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Workout plan created successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/workout-plans/:id
// Admin updates a workout plan.
export const updateWorkoutPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (currentUser.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only admins can update workout plans",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan ID",
      });
      return;
    }

    const validation = updateWorkoutPlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan update",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    if (Object.keys(validation.data).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    const plan = await WorkoutPlan.findById(id);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Workout plan not found",
      });
      return;
    }

    // Apply validated fields but preserve protected fields.
    plan.set({
      ...validation.data,
      createdBy: plan.createdBy,
      isActive: plan.isActive,
    });

    await plan.save();

    await plan.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Workout plan updated successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/workout-plans/:id
// Admin deactivates a plan without deleting its history.
export const deactivateWorkoutPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (currentUser.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only admins can deactivate workout plans",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid workout plan ID",
      });
      return;
    }

    const plan = await WorkoutPlan.findById(id);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Workout plan not found",
      });
      return;
    }

    if (!plan.isActive) {
      res.status(409).json({
        success: false,
        message: "Workout plan is already inactive",
      });
      return;
    }

    plan.isActive = false;
    await plan.save();

    res.status(200).json({
      success: true,
      message: "Workout plan deactivated successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};
