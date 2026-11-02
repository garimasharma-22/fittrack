
import { Router } from "express";

import {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deactivateMembershipPlan,
} from "../controllers/membershipPlanController";

import { authenticate } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Membership Plans
 *   description: Manage gym membership plans
 */

/**
 * @swagger
 * /api/membership-plans:
 *   get:
 *     summary: Get all active membership plans
 *     tags: [Membership Plans]
 *     responses:
 *       200:
 *         description: Active membership plans retrieved successfully
 */
router.get("/", getMembershipPlans);

/**
 * @swagger
 * /api/membership-plans/{id}:
 *   get:
 *     summary: Get an active membership plan by ID
 *     tags: [Membership Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membership plan retrieved successfully
 *       400:
 *         description: Invalid membership plan ID
 *       404:
 *         description: Membership plan not found
 */
router.get("/:id", getMembershipPlanById);

/**
 * @swagger
 * /api/membership-plans:
 *   post:
 *     summary: Create a membership plan
 *     tags: [Membership Plans]
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
 *               - description
 *               - durationDays
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Monthly Plan
 *               description:
 *                 type: string
 *                 example: Access to the gym for one month
 *               durationDays:
 *                 type: integer
 *                 example: 30
 *               price:
 *                 type: number
 *                 example: 1500
 *     responses:
 *       201:
 *         description: Membership plan created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  "/",
  authenticate,
  allowRoles("ADMIN"),
  createMembershipPlan
);

/**
 * @swagger
 * /api/membership-plans/{id}:
 *   patch:
 *     summary: Update an active membership plan
 *     tags: [Membership Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               durationDays:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Membership plan updated successfully
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Active plan not found
 */
router.patch(
  "/:id",
  authenticate,
  allowRoles("ADMIN"),
  updateMembershipPlan
);

/**
 * @swagger
 * /api/membership-plans/{id}:
 *   delete:
 *     summary: Deactivate a membership plan
 *     tags: [Membership Plans]
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
 *         description: Membership plan deactivated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Active plan not found
 */
router.delete(
  "/:id",
  authenticate,
  allowRoles("ADMIN"),
  deactivateMembershipPlan
);

export default router;
