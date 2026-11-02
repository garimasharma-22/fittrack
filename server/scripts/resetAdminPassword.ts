
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDatabase } from "../src/config/database";
import User from "../src/models/User";

const resetAdminPassword = async (): Promise<void> => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env"
      );
    }

    if (password.length < 12 || password.length > 72) {
      throw new Error(
        "Admin password must be between 12 and 72 characters."
      );
    }

    await connectDatabase();

    const admin = await User.findOne({ email });

    if (!admin) {
      throw new Error(
        "No account found for ADMIN_EMAIL. No password was changed."
      );
    }

    if (admin.role !== "ADMIN") {
      throw new Error(
        "This account is not an admin. No password was changed."
      );
    }

    if (!admin.isActive) {
      throw new Error(
        "This admin account is inactive. No password was changed."
      );
    }

    admin.passwordHash = await bcrypt.hash(password, 12);
    await admin.save();

    console.log("Admin password updated successfully.");
    console.log("Try logging in with ADMIN_EMAIL and ADMIN_PASSWORD.");
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword().catch((error: unknown) => {
  console.error("Could not reset admin password:", error);
  process.exitCode = 1;
});
