import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authMiddleware";

import {
  createWorkoutAssignment,
  getWorkoutAssignments,
  getWorkoutAssignmentById,
  updateWorkoutAssignment,
} from "../controllers/workoutAssignmentController";

import {
  createWorkoutAssignmentSchema,
  updateWorkoutAssignmentSchema,
} from "../validators/workoutAssignmentValidator";

const router = Router();

function validateBody(schema: {
  safeParse: (data: unknown) => any;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * @swagger
 * tags:
 *   - name: Workout Assignments
 *     description: Assign workout plans to members and manage assignments
 */

/**
 * @swagger
 * /api/workout-assignments:
 *   post:
 *     summary: Assign a workout plan to a member
 *     description: Requires authentication. The controller must restrict assignment creation to admins.
 *     tags: [Workout Assignments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Must match createWorkoutAssignmentSchema.
 *             required:
 *               - memberId
 *               - workoutPlanId
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "671234567890123456789012"
 *               workoutPlanId:
 *                 type: string
 *                 example: "671234567890123456789013"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-11-15"
 *               notes:
 *                 type: string
 *                 example: "Three sessions per week"
 *     responses:
 *       201:
 *         description: Workout plan assigned successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Member or workout plan not found
 */
router.post(
  "/",
  authenticate,
  validateBody(createWorkoutAssignmentSchema),
  createWorkoutAssignment
);

/**
 * @swagger
 * /api/workout-assignments:
 *   get:
 *     summary: List workout assignments
 *     description: Returns assignments according to the authenticated user's role and the controller's access rules.
 *     tags: [Workout Assignments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Workout assignments retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 */
router.get("/", authenticate, getWorkoutAssignments);

/**
 * @swagger
 * /api/workout-assignments/{id}:
 *   get:
 *     summary: Get a workout assignment by ID
 *     description: Access is subject to the controller's authorization and ownership checks.
 *     tags: [Workout Assignments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB workout assignment ID
 *     responses:
 *       200:
 *         description: Workout assignment retrieved successfully
 *       400:
 *         description: Invalid assignment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Workout assignment not found
 */
router.get("/:id", authenticate, getWorkoutAssignmentById);

/**
 * @swagger
 * /api/workout-assignments/{id}:
 *   patch:
 *     summary: Update a workout assignment
 *     description: Requires authentication. The controller must restrict updates to authorized admins.
 *     tags: [Workout Assignments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB workout assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Fields accepted by updateWorkoutAssignmentSchema.
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workout assignment updated successfully
 *       400:
 *         description: Validation failed or invalid assignment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Workout assignment not found
 */
router.patch(
  "/:id",
  authenticate,
  validateBody(updateWorkoutAssignmentSchema),
  updateWorkoutAssignment
);

export default router;