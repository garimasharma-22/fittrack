
import { Router } from "express";
import {
  createPayment,
  getAllPayments,
  getMyPayments,
  getPaymentById,
} from "../controllers/paymentController";
import { authenticate } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

const router = Router();

router.use(authenticate);

// Admin records payments.

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Record a manual payment for a membership
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [membershipId, amount, paymentMethod]
 *             properties:
 *               membershipId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, UPI, CARD, BANK_TRANSFER, OTHER]
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Payment recorded successfully
 *       '400':
 *         description: Invalid payment data
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Membership not found
 *       '409':
 *         description: Payment exceeds remaining balance or membership is cancelled
 */
router.post("/", allowRoles("ADMIN"), createPayment);

// Members view their own payment history.

/**
 * @swagger
 * /api/payments/me:
 *   get:
 *     summary: Get the logged-in member's payment history
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Payment history retrieved successfully
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Member access required
 */
router.get("/me", allowRoles("MEMBER"), getMyPayments);

// Admin views all payment records.

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payment records
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Payments retrieved successfully
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 */
router.get("/", allowRoles("ADMIN"), getAllPayments);

// Admin views any payment; members can view only their own.

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get a payment by ID
 *     description: Admins can view any payment; members can view only their own.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Payment retrieved successfully
 *       '400':
 *         description: Invalid payment ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Access denied
 *       '404':
 *         description: Payment not found
 */
router.get("/:id", getPaymentById);

export default router;
