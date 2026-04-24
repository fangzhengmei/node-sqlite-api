import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { logger } from '../logger/logger.js';
import * as securityService from '../utils/securityService.js';

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

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            logger.warn(`Invalid token: ${err.message}`);
            const error = new Error('Invalid or expired token.');
            error.statusCode = 403;
            throw error;
        }

        if (user.type && user.type !== 'access') {
            logger.warn(`Invalid token type: ${user.type}`);
            const error = new Error('Invalid token type. Please use access token.');
            error.statusCode = 403;
            throw error;
        }

        if (user.jti) {
            const isBlacklisted = await securityService.isTokenBlacklisted(user.jti);
            if (isBlacklisted) {
                logger.warn(`Token is blacklisted: jti=${user.jti}, user=${user.username}`);
                const error = new Error('Token has been revoked. Please login again.');
                error.statusCode = 401;
                throw error;
            }
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

export const optionalAuth = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        req.user = null;
        return next();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            req.user = null;
            return next();
        }

        if (user.jti) {
            const isBlacklisted = await securityService.isTokenBlacklisted(user.jti);
            if (isBlacklisted) {
                req.user = null;
                return next();
            }
        }

        req.user = user;
        next();
    });
});
