import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MembershipPlan from "../models/MembershipPlan";
import {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
} from "../validators/membershipPlanValidator";

// GET /api/membership-plans
// List all active membership plans
export const getMembershipPlans = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plans = await MembershipPlan.find({ isActive: true })
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

// GET /api/membership-plans/:id
// Get one active membership plan
export const getMembershipPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership plan ID",
      });
      return;
    }

    const plan = await MembershipPlan.findOne({
      _id: id,
      isActive: true,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Membership plan not found",
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

// POST /api/membership-plans
// Create a membership plan (ADMIN only)
export const createMembershipPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = createMembershipPlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const plan = await MembershipPlan.create(validation.data);

    res.status(201).json({
      success: true,
      message: "Membership plan created successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/membership-plans/:id
// Update a membership plan (ADMIN only)
export const updateMembershipPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership plan ID",
      });
      return;
    }

    const validation = updateMembershipPlanSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const plan = await MembershipPlan.findOneAndUpdate(
      { _id: id, isActive: true },
      validation.data,
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Active membership plan not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Membership plan updated successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/membership-plans/:id
// Deactivate a membership plan instead of permanently deleting it
export const deactivateMembershipPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership plan ID",
      });
      return;
    }

    const plan = await MembershipPlan.findOneAndUpdate(
      { _id: id, isActive: true },
      { isActive: false },
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Active membership plan not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Membership plan deactivated successfully",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};
