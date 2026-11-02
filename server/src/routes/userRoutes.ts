
import { Router } from "express";

import { updateProfileImage } from "../controllers/authController";
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deactivateMember,
} from "../controllers/userController";

import { authenticate } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";
import { uploadProfileImage } from "../middleware/uploadMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Member management and user profile operations
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List members
 *     description: Admin only. Lists members, optionally filtered by search criteria supported by the controller.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *   post:
 *     summary: Create a member
 *     description: Admin only. Creates a member account.
 *     tags: [Users]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Alex Johnson
 *               email:
 *                 type: string
 *                 format: email
 *                 example: alex@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: Member created successfully
 *       400:
 *         description: Invalid input or member already exists
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a member by ID
 *     tags: [Users]
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
 *         description: Member retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Member not found
 *   patch:
 *     summary: Update a member
 *     description: Admin only. Updates member details or account status.
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Member updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Member not found
 *   delete:
 *     summary: Deactivate a member
 *     description: Admin only. Soft-deactivates a member account.
 *     tags: [Users]
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
 *         description: Member deactivated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Member not found
 */

/**
 * @swagger
 * /api/users/me/profile-image:
 *   patch:
 *     summary: Update my profile picture
 *     description: Uploads a profile picture for the authenticated user.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *       400:
 *         description: Invalid or missing image
 *       401:
 *         description: Authentication required
 */

router.use(authenticate);

// Admin: list members.
router.get("/", allowRoles("ADMIN"), getMembers);

// Admin: create a member.
router.post("/", allowRoles("ADMIN"), createMember);

// Admin: get a member by ID.
router.get("/:id", allowRoles("ADMIN"), getMemberById);

// Admin: update a member.
router.patch("/:id", allowRoles("ADMIN"), updateMember);

// Admin: deactivate a member.
router.delete("/:id", allowRoles("ADMIN"), deactivateMember);

// Authenticated user: update their own profile picture.
router.patch("/me/profile-image", uploadProfileImage, updateProfileImage);

export default router;
