import { Router } from "express";

import {
  createMembership,
  getMyMemberships,
  getAllMemberships,
  getExpiringMemberships,
  getMembershipById,
  cancelMembership,
  renewMembership,
} from "../controllers/membershipController";

import { authenticate } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

const router = Router();

// Every route requires a valid, active user's authentication.
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Memberships
 *     description: Member subscriptions, expiry, renewal, and cancellation
 */

/**
 * @swagger
 * /api/memberships:
 *   post:
 *     summary: Assign a membership to a member
 *     description: Admin only. Assigns a membership using an existing membership plan.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - planId
 *               - startDate
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: 671234567890123456789012
 *               planId:
 *                 type: string
 *                 example: 671234567890123456789013
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-15"
 *     responses:
 *       201:
 *         description: Membership assigned successfully
 *       400:
 *         description: Invalid request or membership data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Member or membership plan not found
 */
router.post("/", allowRoles("ADMIN"), createMembership);



// GET /api/memberships: admin views all memberships
router.get("/", allowRoles("ADMIN"), getAllMemberships);

/**
 * @swagger
 * /api/memberships/me:
 *   get:
 *     summary: Get my memberships
 *     description: Member only. Returns memberships belonging to the authenticated member.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Own memberships retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Member role required
 */
router.get("/me", allowRoles("MEMBER"), getMyMemberships);

/**
 * @swagger
 * /api/memberships/expiring:
 *   get:
 *     summary: Get expiring memberships
 *     description: Admin only. Returns memberships expiring within the controller's configured period.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Expiring memberships retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 */
router.get(
  "/expiring",
  allowRoles("ADMIN"),
  getExpiringMemberships
);



/**
 * @swagger
 * /api/memberships/{id}:
 *   get:
 *     summary: Get a membership by ID
 *     description: Admins may view memberships; members may view only memberships they own, as enforced by the controller.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB membership ID
 *     responses:
 *       200:
 *         description: Membership retrieved successfully
 *       400:
 *         description: Invalid membership ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not permitted to view this membership
 *       404:
 *         description: Membership not found
 */
router.get("/:id", getMembershipById);

/**
 * @swagger
 * /api/memberships/{id}/cancel:
 *   patch:
 *     summary: Cancel a membership
 *     description: Admin only.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB membership ID
 *     responses:
 *       200:
 *         description: Membership cancelled successfully
 *       400:
 *         description: Invalid ID or membership cannot be cancelled
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Membership not found
 */
router.patch(
  "/:id/cancel",
  allowRoles("ADMIN"),
  cancelMembership
);

/**
 * @swagger
 * /api/memberships/{id}/renew:
 *   post:
 *     summary: Renew a membership
 *     description: Admin only. Renews an existing membership according to the controller's renewal rules.
 *     tags: [Memberships]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB membership ID
 *     responses:
 *       200:
 *         description: Membership renewed successfully
 *       400:
 *         description: Invalid ID or membership cannot be renewed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Membership not found
 */
router.post(
  "/:id/renew",
  allowRoles("ADMIN"),
  renewMembership
);

export default router;