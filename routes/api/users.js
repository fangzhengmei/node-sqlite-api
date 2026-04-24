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
    deleteUser,
    logoutUser,
    refreshAccessToken,
    lockUserAccount,
    unlockUserAccount
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
 *     description: Authenticate user and receive access token and refresh token. Includes rate limiting and account lock protection.
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
 *         description: Login successful - returns access token (short-lived) and refresh token (long-lived)
 *         content:
 *           application/json:
 *             example:
 *               msg: Login successful
 *               accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               expiresIn: 15m
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
 *               msg: Invalid email or password. Attempts remaining: 3
 *       429:
 *         description: Too many login attempts or account locked
 *         content:
 *           application/json:
 *             example:
 *               msg: Account is temporarily locked. Please try again after 30 minutes.
 */

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Logout user
 *     description: Revoke the current access token and optionally revoke all tokens for the user. This effectively logs the user out.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token to revoke
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Logged out successfully
 *       401:
 *         description: Unauthorized - Invalid or revoked token
 */

/**
 * @swagger
 * /users/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Use a valid refresh token to obtain a new access token (and new refresh token). This allows users to stay logged in without re-entering credentials.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token obtained during login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Token refreshed successfully
 *               accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               expiresIn: 15m
 *       400:
 *         description: Refresh token required
 *         content:
 *           application/json:
 *             example:
 *               msg: Refresh token is required
 *       401:
 *         description: Invalid, expired, or revoked refresh token
 *         content:
 *           application/json:
 *             example:
 *               msg: Invalid or expired refresh token
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
 *                 last_login_at: 2025-09-15T10:30:00Z
 *       401:
 *         description: Unauthorized - No token provided or token revoked
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
 *     description: Update the profile of the currently authenticated user. If password is changed, all refresh tokens are revoked for security.
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
 *                 description: New password (optional - will revoke all refresh tokens)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User updated successfully
 *               info: Password changed. Please login again with new password.
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
 *     description: Retrieve a list of all users including security information like failed login attempts and lock status. Requires admin privileges.
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
 *                   failed_login_attempts: 0
 *                   locked_until: null
 *                   last_login_at: 2025-09-15T10:30:00Z
 *                 - id: 2
 *                   username: user1
 *                   email: user1@example.com
 *                   role: user
 *                   created_at: 2025-09-14T06:47:02Z
 *                   updated_at: 2025-09-14T06:47:02Z
 *                   failed_login_attempts: 3
 *                   locked_until: 2025-09-15T11:00:00Z
 *                   last_login_at: 2025-09-15T09:00:00Z
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
 * /users/{id}/lock:
 *   post:
 *     summary: Lock a user account (Admin only)
 *     description: Manually lock a user account. Requires admin privileges. Revokes all refresh tokens for the user.
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
 *         description: The unique ID of the user to lock
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lockDuration:
 *                 type: integer
 *                 description: Lock duration in minutes (default: 30)
 *                 example: 60
 *     responses:
 *       200:
 *         description: User locked successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User locked until 2025-09-15T12:00:00.000Z
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

/**
 * @swagger
 * /users/{id}/unlock:
 *   post:
 *     summary: Unlock a user account (Admin only)
 *     description: Manually unlock a user account. Requires admin privileges.
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
 *         description: The unique ID of the user to unlock
 *     responses:
 *       200:
 *         description: User unlocked successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: User unlocked successfully
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
userRouter.post('/logout', authenticateToken, logoutUser);
userRouter.post('/refresh', refreshAccessToken);

userRouter.get('/me', authenticateToken, getCurrentUser);
userRouter.put('/me', authenticateToken, validateUpdateUser, validationErrorHandler, updateCurrentUser);

userRouter.get('/', authenticateToken, authorizeAdmin, getAllUsers);
userRouter.post('/:id/lock', authenticateToken, authorizeAdmin, validateDeleteUser, validationErrorHandler, lockUserAccount);
userRouter.post('/:id/unlock', authenticateToken, authorizeAdmin, validateDeleteUser, validationErrorHandler, unlockUserAccount);
userRouter.delete('/:id', authenticateToken, authorizeAdmin, validateDeleteUser, validationErrorHandler, deleteUser);
