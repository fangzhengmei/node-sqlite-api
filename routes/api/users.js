import { Router } from "express";
import { validateRegister, validateLogin, validateUpdateUser, validateDeleteUser } from "../../validation/userValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { authenticateToken, authorizeAdmin } from "../../middlewares/authMiddleware.js";
import { 
    registerUser, 
    loginUser, 
    getCurrentUser, 
    updateCurrentUser, 
    getAllUsers, 
    deleteUser 
} from "../../controllers/userController.js";

export const userRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Endpoints for user authentication and management
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with username, email, and password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *                 description: Username (3-50 characters, letters, numbers, underscores only)
 *               email:
 *                 type: string
 *                 example: john@example.com
 *                 description: Valid email address
 *               password:
 *                 type: string
 *                 example: Password123
 *                 description: Password (min 8 characters, at least one uppercase, one lowercase, one number)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User registered successfully
 *               user:
 *                 username: john_doe
 *                 email: john@example.com
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               errors:
 *                 - msg: Username must be between 3 and 50 characters
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             example:
 *               msg: User with this email already exists
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and receive JWT token
 *     tags: [Users]
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
 *                 example: admin@example.com
 *                 description: User email
 *               password:
 *                 type: string
 *                 example: Admin123
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               msg: Login successful
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               user:
 *                 id: 1
 *                 username: admin
 *                 email: admin@example.com
 *                 role: admin
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               msg: Invalid email or password
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the profile of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User retrieved successfully
 *               data:
 *                 id: 1
 *                 username: admin
 *                 email: admin@example.com
 *                 role: admin
 *                 created_at: 2025-09-14T06:47:02Z
 *       401:
 *         description: Unauthorized - No token provided
 *         content:
 *           application/json:
 *             example:
 *               msg: Access denied. No token provided.
 *       403:
 *         description: Forbidden - Invalid or expired token
 *         content:
 *           application/json:
 *             example:
 *               msg: Invalid or expired token.
 */

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     description: Update the profile of the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               username:
 *                 type: string
 *                 example: new_username
 *                 description: New username (optional)
 *               email:
 *                 type: string
 *                 example: newemail@example.com
 *                 description: New email (optional)
 *               password:
 *                 type: string
 *                 example: NewPassword123
 *                 description: New password (optional)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User updated successfully
 *       400:
 *         description: Validation error or no fields provided
 *         content:
 *           application/json:
 *             example:
 *               msg: At least one field must be provided to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             example:
 *               msg: User with this email already exists
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve a list of all users. Requires admin privileges.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Users retrieved successfully
 *               data:
 *                 - id: 1
 *                   username: admin
 *                   email: admin@example.com
 *                   role: admin
 *                   created_at: 2025-09-14T06:47:02Z
 *                   updated_at: 2025-09-14T06:47:02Z
 *                 - id: 2
 *                   username: user1
 *                   email: user1@example.com
 *                   role: user
 *                   created_at: 2025-09-14T06:47:02Z
 *                   updated_at: 2025-09-14T06:47:02Z
 *       204:
 *         description: No users found
 *         content:
 *           application/json:
 *             example:
 *               msg: No users found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *         content:
 *           application/json:
 *             example:
 *               msg: Access denied. Admin privileges required.
 */

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     description: Delete a user by ID. Requires admin privileges. Cannot delete your own account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *         description: The unique ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User deleted successfully
 *       400:
 *         description: Cannot delete your own account
 *         content:
 *           application/json:
 *             example:
 *               msg: You cannot delete your own account
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               msg: User not found
 */

userRouter.post('/register', validateRegister, validationErrorHandler, registerUser);
userRouter.post('/login', validateLogin, validationErrorHandler, loginUser);

userRouter.get('/me', authenticateToken, getCurrentUser);
userRouter.put('/me', authenticateToken, validateUpdateUser, validationErrorHandler, updateCurrentUser);

userRouter.get('/', authenticateToken, authorizeAdmin, getAllUsers);
userRouter.delete('/:id', authenticateToken, authorizeAdmin, validateDeleteUser, validationErrorHandler, deleteUser);
