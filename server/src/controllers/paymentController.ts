import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import Payment from "../models/Payment";
import Membership from "../models/Membership";
import { createPaymentSchema } from "../validators/paymentValidator";

// POST /api/payments
// Admin records a payment for an existing membership.
export const createPayment = async (
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
        message: "Only admins can record payments",
      });
      return;
    }

    const validation = createPaymentSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const {
      membershipId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
    } = validation.data;

    if (!mongoose.isValidObjectId(membershipId)) {
      res.status(400).json({
        success: false,
        message: "Invalid membership ID",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
      return;
    }

    const membership = await Membership.findById(membershipId);

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
        message: "Cannot record a payment for a cancelled membership",
      });
      return;
    }

    const actualPaymentDate = paymentDate
      ? new Date(paymentDate)
      : new Date();

    if (Number.isNaN(actualPaymentDate.getTime())) {
      res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
      return;
    }

    if (actualPaymentDate > new Date()) {
      res.status(400).json({
        success: false,
        message: "Payment date cannot be in the future",
      });
      return;
    }

    // Calculate how much has already been paid for this membership.
    const existingPayments = await Payment.aggregate([
      {
        $match: {
          membershipId: membership._id,
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);

    const totalPaid = existingPayments[0]?.totalPaid ?? 0;
    const remainingBalance = Math.max(
      0,
      membership.priceCharged - totalPaid
    );

    if (amount > remainingBalance) {
      res.status(409).json({
        success: false,
        message: "Payment exceeds the remaining membership balance",
        data: {
          membershipPrice: membership.priceCharged,
          totalPaid,
          remainingBalance,
        },
      });
      return;
    }

    // Derive the member from the membership, never from client input.
    const payment = await Payment.create({
      memberId: membership.memberId,
      membershipId: membership._id,
      amount,
      paymentDate: actualPaymentDate,
      paymentMethod,
      reference,
      notes,
      recordedBy: new mongoose.Types.ObjectId(currentUser.userId),
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate("memberId", "name email phone")
      .populate(
        "membershipId",
        "startDate expiryDate priceCharged status"
      )
      .populate("recordedBy", "name email");

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: populatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments
// Admin views all payments.
export const getAllPayments = async (
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

    if (req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only admins can view all payments",
      });
      return;
    }

    const payments = await Payment.find()
      .populate("memberId", "name email phone")
      .populate(
        "membershipId",
        "startDate expiryDate priceCharged status"
      )
      .populate("recordedBy", "name email")
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/me
// Member views only their own payment history.
export const getMyPayments = async (
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

    if (currentUser.role !== "MEMBER") {
      res.status(403).json({
        success: false,
        message: "This endpoint is for members",
      });
      return;
    }

    const payments = await Payment.find({
      memberId: currentUser.userId,
    })
      .populate(
        "membershipId",
        "startDate expiryDate priceCharged status"
      )
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/:id
// Admin can view any payment; a member can view only their own.
export const getPaymentById = async (
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
        message: "Invalid payment ID",
      });
      return;
    }

    const payment = await Payment.findById(id)
      .populate("memberId", "name email phone")
      .populate(
        "membershipId",
        "startDate expiryDate priceCharged status"
      )
      .populate("recordedBy", "name email");

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment not found",
      });
      return;
    }

    const isAdmin = currentUser.role === "ADMIN";

    // Handle the populated member reference safely.
    const memberReference = payment.memberId as unknown as {
      _id?: { toString(): string };
      toString(): string;
    };

    const paymentMemberId =
      memberReference?._id?.toString() ??
      memberReference?.toString();

    const isOwner = paymentMemberId === currentUser.userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: "You cannot access another member's payment",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};