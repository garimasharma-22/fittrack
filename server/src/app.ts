
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import swaggerSpec from "./config/swagger";

import { handleUploadError } from "./middleware/uploadMiddleware";
import { errorMiddleware } from "./middleware/errorMiddleware";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import membershipPlanRoutes from "./routes/membershipPlanRoutes";
import membershipRoutes from "./routes/membershipRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import workoutPlanRoutes from "./routes/workoutPlanRoutes";
import workoutAssignmentRoutes from "./routes/workoutAssignmentRoutes";


const app = express();

// 1. CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// 2. Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FitTrack API is running",
  });
});

// 4. API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/workout-plans", workoutPlanRoutes);
app.use("/api/workout-assignments", workoutAssignmentRoutes);


// 5. Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// 6. Handle Multer upload errors
app.use(handleUploadError);

// 7. Handle other application errors
app.use(errorMiddleware);

export default app;
