
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import User from "../models/User";
import {
  createMemberSchema,
  updateMemberSchema,
} from "../validators/userValidator";

// GET /api/users
// List members with optional name/email search.
export const getMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = String(req.query.search ?? "").trim();

    const filter: Record<string, unknown> = {
      role: "MEMBER",
    };

    if (search) {
      // Escape regex characters so search input is treated literally.
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const members = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
// Retrieve one member.
export const getMemberById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const member = await User.findOne({
      _id: id,
      role: "MEMBER",
    }).select("-passwordHash");

    if (!member) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users
// Admin creates a member account.
export const createMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = createMemberSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
      return;
    }

    const { name, email, phone, password } = validation.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const member = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "MEMBER",
      isActive: true,
    });

    const safeMember = await User.findById(member._id)
      .select("-passwordHash");

    res.status(201).json({
      success: true,
      message: "Member created successfully.",
      data: safeMember,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id
// Admin updates member details or active status.
export const updateMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const validation = updateMemberSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
      return;
    }

    const updates = validation.data;

    const member = await User.findOne({
      _id: id,
      role: "MEMBER",
    });

    if (!member) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    if (updates.email !== undefined) {
      const duplicateEmail = await User.findOne({
        email: updates.email,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        res.status(409).json({
          success: false,
          message: "That email is already in use.",
        });
        return;
      }
    }

    if (updates.name !== undefined) {
      member.name = updates.name;
    }

    if (updates.email !== undefined) {
      member.email = updates.email;
    }

    if (updates.phone !== undefined) {
      member.set("phone", updates.phone);
    }

    if (updates.isActive !== undefined) {
      member.isActive = updates.isActive;
    }

    await member.save();

    const safeMember = await User.findById(member._id)
      .select("-passwordHash");

    res.status(200).json({
      success: true,
      message: "Member updated successfully.",
      data: safeMember,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
// Soft-deactivate a member to preserve related history.
export const deactivateMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const member = await User.findOne({
      _id: id,
      role: "MEMBER",
    });

    if (!member) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    if (!member.isActive) {
      res.status(409).json({
        success: false,
        message: "Member is already deactivated.",
      });
      return;
    }

    member.isActive = false;
    await member.save();

    res.status(200).json({
      success: true,
      message: "Member deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
};
