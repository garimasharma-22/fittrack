import { Router, Request, Response, NextFunction } from "express";

import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/authController";

import { authenticate } from "../middleware/authMiddleware";

import {
  registerSchema,
  loginSchema,
} from "../validators/authValidator";

import { uploadProfileImage } from "../middleware/uploadMiddleware";

const router = Router();

function validateBody(schema: { safeParse: (data: unknown) => any }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
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
 *   - name: Authentication
 *     description: Member registration, login, logout, and current-user information
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new member
 *     description: Public registration always creates a MEMBER account. Clients cannot register as ADMIN.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Alex Morgan
 *               email:
 *                 type: string
 *                 format: email
 *                 example: alex@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional profile image, if supported by the registration validator.
 *     responses:
 *       201:
 *         description: Member registered successfully
 *       400:
 *         description: Invalid input or validation failed
 *       409:
 *         description: Email already exists
 */
router.post(
  "/register",
  uploadProfileImage,
  validateBody(registerSchema),
  register
);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in
 *     description: Authenticates a user and sets the fittrack_token HTTP-only cookie.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: alex@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *     responses:
 *       200:
 *         description: Login successful; authentication cookie set
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  validateBody(loginSchema),
  login
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out
 *     description: Logs out the authenticated user and clears the authentication cookie.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Authentication required
 */
router.post("/logout", authenticate, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user's information, including their role
 *       401:
 *         description: Authentication required or session invalid
 */
router.get("/me", authenticate, getMe);

export default router;