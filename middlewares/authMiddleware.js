import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { logger } from '../logger/logger.js';

export const authenticateToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        logger.warn('No token provided in request');
        const error = new Error('Access denied. No token provided.');
        error.statusCode = 401;
        throw error;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn(`Invalid token: ${err.message}`);
            const error = new Error('Invalid or expired token.');
            error.statusCode = 403;
            throw error;
        }
        req.user = user;
        logger.info(`User authenticated: ${user.username} (ID: ${user.id})`);
        next();
    });
});

export const authorizeAdmin = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        logger.warn(`User ${req.user.username} (ID: ${req.user.id}) attempted to access admin-only resource`);
        const error = new Error('Access denied. Admin privileges required.');
        error.statusCode = 403;
        throw error;
    }
    next();
});
