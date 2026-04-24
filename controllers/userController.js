import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as securityService from '../utils/securityService.js';

const generateTokenPair = async (user) => {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';
    const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
    const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    const accessJti = securityService.generateJti();
    const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            jti: accessJti,
            type: 'access'
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const decodedAccess = jwt.decode(accessToken);
    const accessExpiresAt = decodedAccess ? new Date(decodedAccess.exp * 1000).toISOString() : null;

    const refreshTokenData = await securityService.createRefreshToken(user.id);

    const refreshJti = securityService.generateJti();
    const refreshToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            jti: refreshJti,
            type: 'refresh',
            token: refreshTokenData.token
        },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    return {
        accessToken,
        refreshToken,
        accessJti,
        accessExpiresAt,
        refreshJti: refreshTokenData.jti,
        refreshExpiresAt: refreshTokenData.expiresAt
    };
};

export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    logger.info(`Attempting to register user with email: ${email}`);

    const checkEmailSQL = `SELECT * FROM users WHERE email = ?`;
    const existingEmail = await fetchFirst(db, checkEmailSQL, [email]);
    if (existingEmail) {
        logger.warn(`Registration failed: email ${email} already exists`);
        const error = new Error("User with this email already exists");
        error.statusCode = 409;
        throw error;
    }

    const checkUsernameSQL = `SELECT * FROM users WHERE username = ?`;
    const existingUsername = await fetchFirst(db, checkUsernameSQL, [username]);
    if (existingUsername) {
        logger.warn(`Registration failed: username ${username} already exists`);
        const error = new Error("User with this username already exists");
        error.statusCode = 409;
        throw error;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    await execute(db, sql, [username, email, hashedPassword]);

    logger.info(`User registered successfully: ${username} (${email})`);
    return res.status(201).json({
        msg: 'User registered successfully',
        user: {
            username,
            email
        }
    });
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    logger.info(`Attempting to login user with email: ${email} from IP: ${ipAddress}`);

    const findUserSQL = `SELECT * FROM users WHERE email = ?`;
    const user = await fetchFirst(db, findUserSQL, [email]);

    const securityCheck = await securityService.checkLoginSecurity(ipAddress, email, user);
    if (!securityCheck.allowed) {
        await securityService.recordLoginAttempt(ipAddress, email, false);
        logger.warn(`Login blocked: ${securityCheck.reason} for email ${email}`);
        const error = new Error(securityCheck.message);
        error.statusCode = 429;
        throw error;
    }

    if (!user) {
        await securityService.recordLoginAttempt(ipAddress, email, false);
        logger.warn(`Login failed: email ${email} not found`);
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        await securityService.recordLoginAttempt(ipAddress, email, false);
        await securityService.incrementFailedLogin(user.id);
        
        const failedAttempts = await securityService.getFailedLoginAttempts(email);
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        const attemptsLeft = maxAttempts - failedAttempts;
        
        logger.warn(`Login failed: invalid password for email ${email}. Attempts left: ${attemptsLeft}`);
        
        const error = new Error(`Invalid email or password. ${attemptsLeft > 0 ? `Attempts remaining: ${attemptsLeft}` : 'Account may be locked after additional failures.`);
        error.statusCode = 401;
        throw error;
    }

    await securityService.recordLoginAttempt(ipAddress, email, true);
    await securityService.resetFailedLogin(user.id);

    const tokens = await generateTokenPair(user);

    logger.info(`User logged in successfully: ${user.username} (ID: ${user.id})`);
    return res.status(200).json({
        msg: 'Login successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

export const logoutUser = asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const { refreshToken } = req.body;
    const userId = req.user ? req.user.id : null;

    logger.info(`User ${userId || 'unknown'} attempting to logout`);

    if (token) {
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.jti && decoded.exp) {
                const expiresAt = new Date(decoded.exp * 1000).toISOString();
                await securityService.blacklistToken(decoded.jti, decoded.id, expiresAt);
            }
        } catch (err) {
            logger.warn(`Invalid token during logout, but proceeding with refresh token revocation`);
        }
    }

    if (refreshToken) {
        await securityService.revokeRefreshToken(refreshToken);
    }

    if (userId && process.env.LOGOUT_REVOKE_ALL === 'true') {
        await securityService.revokeAllUserRefreshTokens(userId);
    }

    logger.info(`User ${userId} logged out successfully`);
    return res.status(200).json({
        msg: 'Logged out successfully'
    });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        logger.warn('Refresh token not provided for token refresh');
        const error = new Error("Refresh token is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info('Attempting to refresh access token');

    const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';
    
    let decodedRefresh;
    try {
        decodedRefresh = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
        logger.warn(`Invalid refresh token: ${err.message}`);
        const error = new Error("Invalid or expired refresh token");
        error.statusCode = 401;
        throw error;
    }

    const validation = await securityService.validateRefreshToken(decodedRefresh.token);
    if (!validation.valid) {
        logger.warn(`Refresh token validation failed: ${validation.reason}`);
        const error = new Error("Invalid or expired refresh token");
        error.statusCode = 401;
        throw error;
    }

    const tokens = await generateTokenPair(validation.user);

    logger.info(`Access token refreshed successfully for user: ${validation.user.username}`);
    return res.status(200).json({
        msg: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
    });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    logger.info(`Fetching current user: ${req.user.username} (ID: ${req.user.id})`);

    const findUserSQL = `SELECT id, username, email, role, created_at, last_login_at FROM users WHERE id = ?`;
    const user = await fetchFirst(db, findUserSQL, [req.user.id]);

    if (!user) {
        logger.warn(`User not found: ID ${req.user.id}`);
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Current user retrieved: ${user.username}`);
    return res.status(200).json({
        msg: 'User retrieved successfully',
        data: user
    });
});

export const updateCurrentUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const userId = req.user.id;

    logger.info(`Attempting to update user: ID ${userId}`);

    const findUserSQL = `SELECT * FROM users WHERE id = ?`;
    const existingUser = await fetchFirst(db, findUserSQL, [userId]);

    if (!existingUser) {
        logger.warn(`User not found: ID ${userId}`);
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (email && email !== existingUser.email) {
        const checkEmailSQL = `SELECT * FROM users WHERE email = ? AND id != ?`;
        const emailExists = await fetchFirst(db, checkEmailSQL, [email, userId]);
        if (emailExists) {
            logger.warn(`Update failed: email ${email} already exists`);
            const error = new Error("User with this email already exists");
            error.statusCode = 409;
            throw error;
        }
    }

    if (username && username !== existingUser.username) {
        const checkUsernameSQL = `SELECT * FROM users WHERE username = ? AND id != ?`;
        const usernameExists = await fetchFirst(db, checkUsernameSQL, [username, userId]);
        if (usernameExists) {
            logger.warn(`Update failed: username ${username} already exists`);
            const error = new Error("User with this username already exists");
            error.statusCode = 409;
            throw error;
        }
    }

    let updateSQL = 'UPDATE users SET ';
    const params = [];
    const updateFields = [];

    if (username) {
        updateFields.push('username = ?');
        params.push(username);
    }
    if (email) {
        updateFields.push('email = ?');
        params.push(email);
    }
    if (password) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        updateFields.push('password = ?');
        params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
        logger.warn(`No fields provided for update for user ID ${userId}`);
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateSQL += updateFields.join(', ') + ' WHERE id = ?';
    params.push(userId);

    await execute(db, updateSQL, params);

    if (password) {
        await securityService.revokeAllUserRefreshTokens(userId);
        logger.info(`Password changed, all refresh tokens revoked for user: ${userId}`);
    }

    logger.info(`User updated successfully: ID ${userId}`);
    return res.status(200).json({
        msg: 'User updated successfully',
        ...(password && { info: 'Password changed. Please login again with new password.' })
    });
});

export const getAllUsers = asyncHandler(async (req, res) => {
    logger.info(`Admin ${req.user.username} fetching all users`);

    const getUsersSQL = `
        SELECT id, username, email, role, created_at, updated_at, 
               failed_login_attempts, locked_until, last_login_at 
        FROM users
    `;
    const users = await fetchAll(db, getUsersSQL);

    if (!users || users.length === 0) {
        logger.warn("No users found");
        return res.status(204).json({ msg: "No users found" });
    }

    logger.info(`Retrieved ${users.length} users`);
    return res.status(200).json({
        msg: 'Users retrieved successfully',
        data: users
    });
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    if (parseInt(id) === adminId) {
        logger.warn(`Admin ${adminId} attempted to delete their own account`);
        const error = new Error("You cannot delete your own account");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Admin ${adminId} attempting to delete user ID ${id}`);

    const findUserSQL = `SELECT * FROM users WHERE id = ?`;
    const user = await fetchFirst(db, findUserSQL, [id]);

    if (!user) {
        logger.warn(`User not found: ID ${id}`);
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    await securityService.revokeAllUserRefreshTokens(parseInt(id));

    const deleteSQL = `DELETE FROM users WHERE id = ?`;
    await execute(db, deleteSQL, [id]);

    logger.info(`User deleted successfully: ID ${id}`);
    return res.status(200).json({
        msg: 'User deleted successfully'
    });
});

export const lockUserAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lockDuration = parseInt(req.body.lockDuration) || 30;

    logger.info(`Admin ${req.user.username} attempting to lock user ID ${id}`);

    const findUserSQL = `SELECT * FROM users WHERE id = ?`;
    const user = await fetchFirst(db, findUserSQL, [id]);

    if (!user) {
        logger.warn(`User not found: ID ${id}`);
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const lockUntil = new Date(Date.now() + (lockDuration * 60 * 1000)).toISOString();
    const sql = `UPDATE users SET locked_until = ? WHERE id = ?`;
    await execute(db, sql, [lockUntil, id]);

    await securityService.revokeAllUserRefreshTokens(parseInt(id));

    logger.info(`User ${id} locked until ${lockUntil} by admin ${req.user.id}`);
    return res.status(200).json({
        msg: `User locked until ${lockUntil}`
    });
});

export const unlockUserAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Admin ${req.user.username} attempting to unlock user ID ${id}`);

    const findUserSQL = `SELECT * FROM users WHERE id = ?`;
    const user = await fetchFirst(db, findUserSQL, [id]);

    if (!user) {
        logger.warn(`User not found: ID ${id}`);
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const sql = `UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?`;
    await execute(db, sql, [id]);

    logger.info(`User ${id} unlocked by admin ${req.user.id}`);
    return res.status(200).json({
        msg: 'User unlocked successfully'
    });
});
