
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import Membership from "../models/Membership";
import MembershipPlan from "../models/MembershipPlan";
import User from "../models/User";

import {
  createMembershipSchema,
  cancelMembershipSchema,
  renewMembershipSchema,
} from "../validators/membershipValidator";

// Calculate the correct status using membership dates.
const getCurrentStatus = (
  startDate: Date,
  expiryDate: Date
): "UPCOMING" | "ACTIVE" | "EXPIRED" => {
  const now = new Date();

  if (expiryDate <= now) {
    return "EXPIRED";
  }

  if (startDate > now) {
    return "UPCOMING";
  }

  return "ACTIVE";
};

// Refresh date-based membership statuses in the database.
const refreshMembershipStatuses = async (): Promise<void> => {
  const now = new Date();

  await Membership.updateMany(
    {
      status: { $in: ["ACTIVE", "UPCOMING"] },
      expiryDate: { $lte: now },
    },
    { $set: { status: "EXPIRED" } }
  );

  await Membership.updateMany(
    {
      status: "UPCOMING",
      startDate: { $lte: now },
      expiryDate: { $gt: now },
    },
    { $set: { status: "ACTIVE" } }
  );
};

// POST /api/memberships
// Admin assigns a membership plan to a member.
export const createMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = createMembershipSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const { memberId, planId, startDate } = validation.data;

    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Only an active MEMBER account can receive a membership.
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

    // The selected membership plan must be active.
    const plan = await MembershipPlan.findOne({
      _id: planId,
      isActive: true,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Active membership plan not found",
      });
      return;
    }

    const membershipStartDate = startDate
      ? new Date(startDate)
      : new Date();

    if (Number.isNaN(membershipStartDate.getTime())) {
      res.status(400).json({
        success: false,
        message: "Invalid membership start date",
      });
      return;
    }

    const expiryDate = new Date(membershipStartDate);

    expiryDate.setDate(
      expiryDate.getDate() + plan.durationDays
    );

    if (
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate <= membershipStartDate
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid membership dates",
      });
      return;
    }

    // Prevent overlapping active or upcoming memberships.
    const existingMembership = await Membership.findOne({
      memberId: member._id,
      status: { $in: ["ACTIVE", "UPCOMING"] },
      startDate: { $lt: expiryDate },
      expiryDate: { $gt: membershipStartDate },
    });

    if (existingMembership) {
      res.status(409).json({
        success: false,
        message:
          "This member already has a membership covering the requested period",
      });
      return;
    }

    const membership = await Membership.create({
      memberId: member._id,
      planId: plan._id,
      startDate: membershipStartDate,
      expiryDate,
      priceCharged: plan.price,
      status: getCurrentStatus(
        membershipStartDate,
        expiryDate
      ),
      assignedBy: new mongoose.Types.ObjectId(
        currentUser.userId
      ),
    });

    res.status(201).json({
      success: true,
      message: "Membership assigned successfully",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/memberships/me
// Member views only their own memberships.
export const getMyMemberships = async (
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

    const memberships = await Membership.find({
      memberId: currentUser.userId,
    })
      .populate("planId", "name description durationDays price")
      .sort({ createdAt: -1 });

    // Refresh statuses without changing cancellations.
    for (const membership of memberships) {
      if (membership.status === "CANCELLED") {
        continue;
      }

      const currentStatus = getCurrentStatus(
        membership.startDate,
        membership.expiryDate
      );

      if (membership.status !== currentStatus) {
        membership.status = currentStatus;
        await membership.save();
      }
    }

    res.status(200).json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/memberships
 * Admin views all memberships.
 */
export const getAllMemberships = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await refreshMembershipStatuses();

    const memberships = await Membership.find()
      .populate("memberId", "name email phone")
      .populate("planId", "name description durationDays price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/memberships/expiring
// Admin views memberships expiring within the next seven days.
export const getExpiringMemberships = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now);

    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const memberships = await Membership.find({
      status: "ACTIVE",
      startDate: { $lte: now },
      expiryDate: {
        $gt: now,
        $lte: sevenDaysLater,
      },
    })
      .populate("memberId", "name email phone")
      .populate("planId", "name durationDays price")
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/memberships/:id
// Admin can view any membership.
// Member can view only their own membership.
export const getMembershipById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership ID",
      });
      return;
    }

    const membership = await Membership.findById(id)
      .populate("memberId", "name email phone")
      .populate(
        "planId",
        "name description durationDays price"
      );

    if (!membership) {
      res.status(404).json({
        success: false,
        message: "Membership not found",
      });
      return;
    }

    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const isAdmin = currentUser.role === "ADMIN";

    // Safely obtain the member ID whether the reference
    // is populated or is still a MongoDB ObjectId.
    const memberReference = membership.memberId as unknown as {
      _id?: { toString(): string };
      toString(): string;
    };

    const membershipMemberId =
      memberReference?._id?.toString() ??
      memberReference?.toString();

    const belongsToMember =
      membershipMemberId === currentUser.userId;

    if (!isAdmin && !belongsToMember) {
      res.status(403).json({
        success: false,
        message:
          "You cannot access another member's membership",
      });
      return;
    }

    // Refresh the date-based status, preserving cancellations.
    if (membership.status !== "CANCELLED") {
      const currentStatus = getCurrentStatus(
        membership.startDate,
        membership.expiryDate
      );

      if (membership.status !== currentStatus) {
        membership.status = currentStatus;
        await membership.save();
      }
    }

    res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/memberships/:id/cancel
// Admin cancels a membership.
export const cancelMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership ID",
      });
      return;
    }

    const validation = cancelMembershipSchema.safeParse(
      req.body ?? {}
    );

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const membership = await Membership.findById(id);

    if (!membership) {
      res.status(404).json({
        success: false,
        message: "Membership not found",
      });
      return;
    }

    if (membership.status === "CANCELLED") {
      res.status(409).json({
        success: false,
        message: "Membership is already cancelled",
      });
      return;
    }

    const currentStatus = getCurrentStatus(
      membership.startDate,
      membership.expiryDate
    );

    if (currentStatus === "EXPIRED") {
      res.status(409).json({
        success: false,
        message: "Expired memberships cannot be cancelled",
      });
      return;
    }

    membership.status = "CANCELLED";

    await membership.save();

    res.status(200).json({
      success: true,
      message: "Membership cancelled successfully",
      data: {
        membership,
        reason: validation.data.reason ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/memberships/:id/renew
// Admin renews a membership by creating a new record.
export const renewMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership ID",
      });
      return;
    }

    const validation = renewMembershipSchema.safeParse(
      req.body ?? {}
    );

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const previousMembership = await Membership.findById(id);

    if (!previousMembership) {
      res.status(404).json({
        success: false,
        message: "Membership not found",
      });
      return;
    }

    if (previousMembership.status === "CANCELLED") {
      res.status(409).json({
        success: false,
        message: "A cancelled membership cannot be renewed",
      });
      return;
    }

    const planId =
      validation.data.planId ??
      previousMembership.planId.toString();

    const plan = await MembershipPlan.findOne({
      _id: planId,
      isActive: true,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Active membership plan not found",
      });
      return;
    }

    const now = new Date();

    // Continue after the previous expiry if it is in the future.
    // Otherwise, start the renewal now.
    const startDate =
      previousMembership.expiryDate > now
        ? new Date(previousMembership.expiryDate)
        : now;

    const expiryDate = new Date(startDate);

    expiryDate.setDate(
      expiryDate.getDate() + plan.durationDays
    );

    // Prevent overlapping active or upcoming memberships.
    const conflictingMembership = await Membership.findOne({
      memberId: previousMembership.memberId,
      status: { $in: ["ACTIVE", "UPCOMING"] },
      startDate: { $lt: expiryDate },
      expiryDate: { $gt: startDate },
    });

    if (conflictingMembership) {
      res.status(409).json({
        success: false,
        message:
          "Another membership already covers the renewal period",
      });
      return;
    }

    const membership = await Membership.create({
      memberId: previousMembership.memberId,
      planId: plan._id,
      startDate,
      expiryDate,
      priceCharged: plan.price,
      status: getCurrentStatus(startDate, expiryDate),
      assignedBy: new mongoose.Types.ObjectId(
        currentUser.userId
      ),
    });

    res.status(201).json({
      success: true,
      message: "Membership renewed successfully",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
};
