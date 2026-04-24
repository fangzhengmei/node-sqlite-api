import crypto from 'crypto';
import { execute, fetchFirst, fetchAll } from "./dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES) || 30;
const RATE_LIMIT_WINDOW_MINUTES = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15;
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.MAX_REQUESTS_PER_WINDOW) || 100;

export const generateJti = () => {
    return crypto.randomUUID();
};

export const recordLoginAttempt = async (ipAddress, email, success) => {
    const sql = `INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, ?)`;
    await execute(db, sql, [ipAddress, email, success ? 1 : 0]);
    logger.info(`Login attempt recorded: IP=${ipAddress}, email=${email}, success=${success}`);
};

export const getFailedLoginAttempts = async (email) => {
    const lockWindow = new Date(Date.now() - (LOCK_DURATION_MINUTES * 60 * 1000)).toISOString();
    const sql = `
        SELECT COUNT(*) as count 
        FROM login_attempts 
        WHERE email = ? 
        AND success = 0 
        AND created_at > ?
    `;
    const result = await fetchFirst(db, sql, [email, lockWindow]);
    return result ? result.count : 0;
};

export const incrementFailedLogin = async (userId) => {
    const sql = `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?`;
    await execute(db, sql, [userId]);
};

export const resetFailedLogin = async (userId) => {
    const now = new Date().toISOString();
    const sql = `UPDATE users SET failed_login_attempts = 0, last_login_at = ? WHERE id = ?`;
    await execute(db, sql, [now, userId]);
};

export const lockUser = async (userId) => {
    const lockUntil = new Date(Date.now() + (LOCK_DURATION_MINUTES * 60 * 1000)).toISOString();
    const sql = `UPDATE users SET locked_until = ? WHERE id = ?`;
    await execute(db, sql, [lockUntil, userId]);
    logger.warn(`User ${userId} locked until ${lockUntil}`);
};

export const isUserLocked = async (user) => {
    if (!user.locked_until) return false;
    
    const now = new Date();
    const lockedUntil = new Date(user.locked_until);
    
    if (now < lockedUntil) {
        return true;
    }
    
    const sql = `UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?`;
    await execute(db, sql, [user.id]);
    logger.info(`User ${user.id} lock expired, unlocked automatically`);
    
    return false;
};

export const checkRateLimit = async (ipAddress) => {
    const windowStart = new Date(Date.now() - (RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)).toISOString();
    const sql = `
        SELECT COUNT(*) as count 
        FROM login_attempts 
        WHERE ip_address = ? 
        AND created_at > ?
    `;
    const result = await fetchFirst(db, sql, [ipAddress, windowStart]);
    const count = result ? result.count : 0;
    
    return {
        allowed: count < MAX_REQUESTS_PER_WINDOW,
        current: count,
        limit: MAX_REQUESTS_PER_WINDOW,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES
    };
};

export const checkLoginSecurity = async (ipAddress, email, user) => {
    const rateLimit = await checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
        logger.warn(`Rate limit exceeded for IP: ${ipAddress}`);
        return {
            allowed: false,
            reason: 'rate_limit',
            message: `Too many login attempts. Please try again after ${rateLimit.windowMinutes} minutes.`
        };
    }

    if (user && await isUserLocked(user)) {
        const lockedUntil = new Date(user.locked_until);
        const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
        logger.warn(`Login attempt from locked user: ${email}`);
        return {
            allowed: false,
            reason: 'locked',
            message: `Account is temporarily locked. Please try again after ${minutesLeft} minutes.`
        };
    }

    if (user) {
        const failedAttempts = await getFailedLoginAttempts(email);
        if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
            await lockUser(user.id);
            return {
                allowed: false,
                reason: 'locked',
                message: `Too many failed login attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`
            };
        }
    }

    return { allowed: true };
};

export const blacklistToken = async (jti, userId, expiresAt) => {
    const sql = `
        INSERT INTO token_blacklist (token_jti, user_id, expires_at) 
        VALUES (?, ?, ?)
    `;
    await execute(db, sql, [jti, userId, expiresAt]);
    logger.info(`Token blacklisted: jti=${jti}, userId=${userId}`);
};

export const isTokenBlacklisted = async (jti) => {
    const sql = `SELECT id FROM token_blacklist WHERE token_jti = ?`;
    const result = await fetchFirst(db, sql, [jti]);
    return result !== null;
};

export const cleanupExpiredBlacklist = async () => {
    const now = new Date().toISOString();
    const sql = `DELETE FROM token_blacklist WHERE expires_at < ?`;
    const result = await execute(db, sql, [now]);
    if (result && result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} expired tokens from blacklist`);
    }
};

export const createRefreshToken = async (userId) => {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const jti = generateJti();
    const refreshExpiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 7;
    const expiresAt = new Date(Date.now() + (refreshExpiryDays * 24 * 60 * 60 * 1000)).toISOString();
    
    const sql = `
        INSERT INTO refresh_tokens (user_id, token, jti, expires_at) 
        VALUES (?, ?, ?, ?)
    `;
    await execute(db, sql, [userId, refreshToken, jti, expiresAt]);
    
    logger.info(`Refresh token created for user: ${userId}`);
    return { token: refreshToken, jti, expiresAt };
};

export const validateRefreshToken = async (refreshToken) => {
    const sql = `
        SELECT rt.*, u.username, u.email, u.role 
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ?
    `;
    const token = await fetchFirst(db, sql, [refreshToken]);
    
    if (!token) {
        return { valid: false, reason: 'not_found' };
    }
    
    if (token.revoked) {
        return { valid: false, reason: 'revoked' };
    }
    
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    if (now > expiresAt) {
        return { valid: false, reason: 'expired' };
    }
    
    return {
        valid: true,
        user: {
            id: token.user_id,
            username: token.username,
            email: token.email,
            role: token.role
        },
        jti: token.jti
    };
};

export const revokeRefreshToken = async (refreshToken) => {
    const sql = `UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`;
    const result = await execute(db, sql, [refreshToken]);
    if (result && result.changes > 0) {
        logger.info(`Refresh token revoked`);
    }
};

export const revokeAllUserRefreshTokens = async (userId) => {
    const sql = `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`;
    const result = await execute(db, sql, [userId]);
    if (result && result.changes > 0) {
        logger.info(`Revoked ${result.changes} refresh tokens for user: ${userId}`);
    }
};

export const cleanupExpiredRefreshTokens = async () => {
    const now = new Date().toISOString();
    const sql = `DELETE FROM refresh_tokens WHERE expires_at < ?`;
    const result = await execute(db, sql, [now]);
    if (result && result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} expired refresh tokens`);
    }
};
