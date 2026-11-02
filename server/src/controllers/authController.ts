
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import cloudinary from "../config/cloudinary";

import User from "../models/User";
import { registerSchema, loginSchema } from "../validators/authValidator";
import { createToken } from "../utils/jwt";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

const uploadImage = (
  buffer: Buffer
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "fittrack/profile-images",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Image upload failed"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });

const removeImage = async (publicId?: string): Promise<void> => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary cleanup failed:", error);
  }
};

const safeUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: { url: string; publicId: string };
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
  profileImage: user.profileImage?.url ?? null,
});

// Register a new member.
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let uploadedPublicId: string | undefined;

  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid registration details.",
        errors: parsed.error.issues,
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
      return;
    }

    const { name, phone, email, password } = parsed.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const profileImage = await uploadImage(req.file.buffer);
    uploadedPublicId = profileImage.publicId;

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration must never assign an administrator role.
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "MEMBER",
      profileImage,
    });

    const token = createToken({
      userId: String(user._id),
      role: user.role,
    });

    res.cookie("fittrack_token", token, cookieOptions);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: safeUser(user),
    });
  } catch (error) {
    // Clean up the uploaded image if registration fails.
    await removeImage(uploadedPublicId);

    // Handle duplicate email errors, including concurrent registrations.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    next(error);
  }
};

// Log in an existing user.
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login details.",
      });
      return;
    }

    const user = await User.findOne({
      email: parsed.data.email,
    }).select("+passwordHash");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash
    );

    if (!passwordMatches || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = createToken({
      userId: String(user._id),
      role: user.role,
    });

    res.cookie("fittrack_token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Log out the authenticated user.
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie("fittrack_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// Get the currently authenticated user.
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: "Your account is inactive.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Update the authenticated user's profile picture.
export const updateProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let uploadedPublicId: string | undefined;

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
      return;
    }

    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: "Your account is inactive.",
      });
      return;
    }

    const newImage = await uploadImage(req.file.buffer);
    uploadedPublicId = newImage.publicId;

    const oldPublicId = user.profileImage?.publicId;

    user.profileImage = newImage;
    await user.save();

    // The database now references the new image.
    uploadedPublicId = undefined;

    // Delete the old image only after the save succeeds.
    if (oldPublicId && oldPublicId !== newImage.publicId) {
      await removeImage(oldPublicId);
    }

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      user: safeUser(user),
    });
  } catch (error) {
    await removeImage(uploadedPublicId);
    next(error);
  }
};