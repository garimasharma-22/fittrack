
import { Router } from "express";
import {
  createWorkoutPlan,
  deactivateWorkoutPlan,
  getWorkoutPlanById,
  getWorkoutPlans,
  updateWorkoutPlan,
} from "../controllers/workoutPlanController";
import { authenticate } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";
import {
  uploadWorkoutImage,
} from "../middleware/uploadMiddleware";

import {
  uploadWorkoutPlanImage,
} from "../controllers/workoutImageController";

import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
} from "../validators/workoutPlanValidator";
import { Request, Response, NextFunction } from "express";

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

// All workout plan routes require a valid login.
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Workout Plans
 *   description: Manage workout plans and exercises
 */

/**
 * @swagger
 * /api/workout-plans:
 *   get:
 *     summary: List workout plans
 *     tags: [Workout Plans]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Workout plans retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/", getWorkoutPlans);

/**
 * @swagger
 * /api/workout-plans/{id}:
 *   get:
 *     summary: Get a workout plan by ID
 *     tags: [Workout Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout plan retrieved successfully
 *       400:
 *         description: Invalid workout plan ID
 *       404:
 *         description: Workout plan not found
 */
router.get("/:id", getWorkoutPlanById);

/**
 * @swagger
 * /api/workout-plans:
 *   post:
 *     summary: Create a workout plan (Admin only)
 *     tags: [Workout Plans]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - difficulty
 *               - exercises
 *             properties:
 *               name:
 *                 type: string
 *                 example: Full Body Strength
 *               description:
 *                 type: string
 *                 example: A full body strength training plan
 *               difficulty:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *                 example: BEGINNER
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Push-ups
 *                     description:
 *                       type: string
 *                       example: Standard bodyweight push-ups
 *                     sets:
 *                       type: integer
 *                       minimum: 1
 *                       example: 3
 *                     repetitions:
 *                       type: integer
 *                       minimum: 1
 *                       example: 12
 *                     durationMinutes:
 *                       type: integer
 *                       minimum: 1
 *                       example: 10
 *                     restSeconds:
 *                       type: integer
 *                       minimum: 0
 *                       example: 60
 *     responses:
 *       201:
 *         description: Workout plan created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  "/",
  allowRoles("ADMIN"),
  validateBody(createWorkoutPlanSchema),
  createWorkoutPlan
);

/**
 * @swagger
 * /api/workout-plans/{id}:
 *   patch:
 *     summary: Update a workout plan (Admin only)
 *     tags: [Workout Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout plan updated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Workout plan not found
 */
router.patch(
  "/:id",
  allowRoles("ADMIN"),
  validateBody(updateWorkoutPlanSchema),
  updateWorkoutPlan
);

/**
 * @swagger
 * /api/workout-plans/{id}:
 *   delete:
 *     summary: Deactivate a workout plan (Admin only)
 *     tags: [Workout Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout plan deactivated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Workout plan not found
 */
router.delete("/:id", allowRoles("ADMIN"), deactivateWorkoutPlan);

router.patch(
  "/:id/image",
  allowRoles("ADMIN"),
  uploadWorkoutImage,
  uploadWorkoutPlanImage
);

export default router;
