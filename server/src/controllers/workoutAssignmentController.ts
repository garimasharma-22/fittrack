
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import WorkoutAssignment from "../models/WorkoutAssignment";
import WorkoutPlan from "../models/WorkoutPlan";
import User from "../models/User";

// POST /api/workout-assignments
// Admin assigns an active workout plan to an active member.
export const createWorkoutAssignment = async (
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
        message: "Only admins can assign workouts",
      });
      return;
    }

    const {
      memberId,
      workoutPlanId,
      startDate,
      endDate,
      notes,
    } = req.body ?? {};

    if (
      typeof memberId !== "string" ||
      typeof workoutPlanId !== "string" ||
      !mongoose.isValidObjectId(memberId) ||
      !mongoose.isValidObjectId(workoutPlanId)
    ) {
      res.status(400).json({
        success: false,
        message: "Valid memberId and workoutPlanId are required",
      });
      return;
    }



    console.log("DEBUG startDate:", startDate);
    console.log("DEBUG type:", typeof startDate);
    console.log("DEBUG parsed date:", new Date(startDate).toString());



    if (
      startDate !== undefined &&
      !(
        (typeof startDate === "string" ||
          startDate instanceof Date) &&
        !Number.isNaN(new Date(startDate).getTime())
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
      return;
    }

    if (
      endDate !== undefined &&
      endDate !== null &&
      !(
        (typeof endDate === "string" ||
          endDate instanceof Date) &&
        !Number.isNaN(new Date(endDate).getTime())
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid end date",
      });
      return;
    }

    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      res.status(400).json({
        success: false,
        message: "Notes must be text of at most 1000 characters",
      });
      return;
    }

    const assignmentStartDate = startDate
      ? new Date(startDate)
      : new Date();

    const assignmentEndDate =
      endDate == null ? undefined : new Date(endDate);

    if (
      assignmentEndDate &&
      assignmentEndDate < assignmentStartDate
    ) {
      res.status(400).json({
        success: false,
        message: "End date must be on or after the start date",
      });
      return;
    }

    const member = await User.findOne({
      _id: memberId,
      role: "MEMBER",
      isActive: true,
    });

    if (!member) {
      res.status(404).json({
        success: false,
        message: "Active member not found",
      });
      return;
    }

    const plan = await WorkoutPlan.findOne({
      _id: workoutPlanId,
      isActive: true,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Active workout plan not found",
      });
      return;
    }

    const assignment = await WorkoutAssignment.create({
      memberId: member._id,
      workoutPlanId: plan._id,
      assignedBy: new mongoose.Types.ObjectId(currentUser.userId),
      startDate: assignmentStartDate,
      ...(assignmentEndDate
        ? { endDate: assignmentEndDate }
        : {}),
      ...(notes !== undefined ? { notes: notes.trim() } : {}),
      status: "ACTIVE",
    });

    await assignment.populate([
      { path: "memberId", select: "name email" },
      { path: "workoutPlanId" },
      { path: "assignedBy", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Workout assigned successfully",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/workout-assignments
// Admin sees all assignments; members see only their own.
export const getWorkoutAssignments = async (
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

    const filter =
      currentUser.role === "ADMIN"
        ? {}
        : { memberId: currentUser.userId };

    const assignments = await WorkoutAssignment.find(filter)
      .populate("memberId", "name email")
      .populate("workoutPlanId")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/workout-assignments/:id
// Admin sees any assignment; members see only their own.
export const getWorkoutAssignmentById = async (
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

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
      return;
    }

    const assignment = await WorkoutAssignment.findById(id);

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
      return;
    }

    const isOwner =
      assignment.memberId.toString() === currentUser.userId;

    if (currentUser.role !== "ADMIN" && !isOwner) {
      res.status(403).json({
        success: false,
        message: "You cannot access another member's assignment",
      });
      return;
    }

    await assignment.populate([
      { path: "memberId", select: "name email" },
      { path: "workoutPlanId" },
      { path: "assignedBy", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/workout-assignments/:id
// Only admins can modify assignment details and status.
export const updateWorkoutAssignment = async (
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
        message: "Only admins can update workout assignments",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
      return;
    }

    const updates: unknown = req.body;

    if (
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      res.status(400).json({
        success: false,
        message: "Request body must be an object",
      });
      return;
    }

    const data = updates as Record<string, unknown>;
    const fields = Object.keys(data);
    const allowedFields = ["status", "endDate", "notes"];

    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      res.status(400).json({
        success: false,
        message:
          "Only status, endDate, and notes can be updated",
      });
      return;
    }

    if (
      data.status !== undefined &&
      !["ACTIVE", "COMPLETED", "CANCELLED"].includes(
        String(data.status)
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid assignment status",
      });
      return;
    }

    if (
      data.notes !== undefined &&
      (typeof data.notes !== "string" || data.notes.length > 1000)
    ) {
      res.status(400).json({
        success: false,
        message: "Notes must be text of at most 1000 characters",
      });
      return;
    }

    let parsedEndDate: Date | null | undefined;

    if (data.endDate === null) {
      parsedEndDate = null;
    } else if (data.endDate !== undefined) {
      if (typeof data.endDate !== "string") {
        res.status(400).json({
          success: false,
          message: "End date must be a valid date or null",
        });
        return;
      }

      parsedEndDate = new Date(data.endDate);

      if (Number.isNaN(parsedEndDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Invalid end date",
        });
        return;
      }
    }

    const assignment = await WorkoutAssignment.findById(id);

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
      return;
    }

    const effectiveEndDate =
      parsedEndDate === undefined
        ? assignment.endDate
        : parsedEndDate;

    if (
      effectiveEndDate &&
      effectiveEndDate < assignment.startDate
    ) {
      res.status(400).json({
        success: false,
        message: "End date must be on or after the start date",
      });
      return;
    }

    if (data.status !== undefined) {
      assignment.status = data.status as typeof assignment.status;
    }

    if (parsedEndDate !== undefined) {
      assignment.endDate = parsedEndDate as typeof assignment.endDate;
    }

    if (data.notes !== undefined) {
      assignment.notes = (data.notes as string).trim();
    }

    await assignment.save();

    await assignment.populate([
      { path: "memberId", select: "name email" },
      { path: "workoutPlanId" },
      { path: "assignedBy", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};
