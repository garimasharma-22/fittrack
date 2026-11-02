
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDatabase } from "../src/config/database";
import User from "../src/models/User";

const createAdmin = async (): Promise<void> => {
  try {
    const name = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env"
      );
    }

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters");
    }

    await connectDatabase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === "ADMIN") {
        console.log("An admin with this email already exists.");
        return;
      }

      throw new Error(
        "This email already belongs to a non-admin user. Choose a different admin email."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    });

    console.log("Admin account created successfully.");
    console.log("Log in using the configured admin email and password.");
    console.log("After logging in, upload a profile picture.");
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin().catch((error: unknown) => {
  console.error("Could not create admin:", error);
  process.exitCode = 1;
});
