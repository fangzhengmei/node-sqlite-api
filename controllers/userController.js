import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    logger.info(`Attempting to login user with email: ${email}`);

    const findUserSQL = `SELECT * FROM users WHERE email = ?`;
    const user = await fetchFirst(db, findUserSQL, [email]);

    if (!user) {
        logger.warn(`Login failed: email ${email} not found`);
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        logger.warn(`Login failed: invalid password for email ${email}`);
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`User logged in successfully: ${user.username} (ID: ${user.id})`);
    return res.status(200).json({
        msg: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    logger.info(`Fetching current user: ${req.user.username} (ID: ${req.user.id})`);

    const findUserSQL = `SELECT id, username, email, role, created_at FROM users WHERE id = ?`;
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

    logger.info(`User updated successfully: ID ${userId}`);
    return res.status(200).json({
        msg: 'User updated successfully'
    });
});

export const getAllUsers = asyncHandler(async (req, res) => {
    logger.info(`Admin ${req.user.username} fetching all users`);

    const getUsersSQL = `SELECT id, username, email, role, created_at, updated_at FROM users`;
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

    const deleteSQL = `DELETE FROM users WHERE id = ?`;
    await execute(db, deleteSQL, [id]);

    logger.info(`User deleted successfully: ID ${id}`);
    return res.status(200).json({
        msg: 'User deleted successfully'
    });
});
