import jwt from 'jsonwebtoken';
import { authenticateToken, authorizeAdmin, optionalAuth } from '../../middlewares/authMiddleware.js';
import { logger } from '../../logger/logger.js';
import * as securityService from '../../utils/securityService.js';

jest.mock('jsonwebtoken');
jest.mock('../../utils/securityService.js');
jest.mock('../../logger/logger.js', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn()
    }
}));

describe('Auth Middleware Tests (Updated for Security Features)', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('authenticateToken', () => {
        test('should call next with error if no token provided', async () => {
            req.headers = {};

            await authenticateToken(req, res, next);

            expect(logger.warn).toHaveBeenCalledWith('No token provided in request');
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Access denied. No token provided.',
                statusCode: 401
            }));
        });

        test('should call next with error if token format is invalid', async () => {
            req.headers.authorization = 'InvalidTokenFormat';

            await authenticateToken(req, res, next);

            expect(logger.warn).toHaveBeenCalledWith('No token provided in request');
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 401
            }));
        });

        test('should call next with error if token is invalid', async () => {
            req.headers.authorization = 'Bearer invalid.token.here';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Invalid token'), null);
            });

            await authenticateToken(req, res, next);

            expect(logger.warn).toHaveBeenCalledWith('Invalid token: Invalid token');
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Invalid or expired token.',
                statusCode: 403
            }));
        });

        test('should call next with error if token type is not "access"', async () => {
            const mockRefreshToken = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                jti: 'jti_123',
                type: 'refresh'
            };
            req.headers.authorization = 'Bearer valid.refresh.token';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockRefreshToken);
            });

            await authenticateToken(req, res, next);

            expect(logger.warn).toHaveBeenCalledWith('Invalid token type: refresh');
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Invalid token type. Please use access token.',
                statusCode: 403
            }));
        });

        test('should call next with error if token is blacklisted', async () => {
            const mockAccessToken = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                jti: 'blacklisted_jti_456',
                type: 'access'
            };
            req.headers.authorization = 'Bearer blacklisted.token';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockAccessToken);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(true);

            await authenticateToken(req, res, next);

            expect(securityService.isTokenBlacklisted).toHaveBeenCalledWith('blacklisted_jti_456');
            expect(logger.warn).toHaveBeenCalledWith(
                'Token is blacklisted: jti=blacklisted_jti_456, user=testuser'
            );
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Token has been revoked. Please login again.',
                statusCode: 401
            }));
        });

        test('should set req.user and call next if token is valid and not blacklisted', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                jti: 'valid_jti_789',
                type: 'access'
            };
            req.headers.authorization = 'Bearer valid.token.here';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(false);

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(securityService.isTokenBlacklisted).toHaveBeenCalledWith('valid_jti_789');
            expect(logger.info).toHaveBeenCalledWith(
                `User authenticated: ${mockUser.username} (ID: ${mockUser.id})`
            );
            expect(next).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        test('should use default secret if JWT_SECRET not set', async () => {
            delete process.env.JWT_SECRET;
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                role: 'user', 
                jti: 'jti_123',
                type: 'access'
            };
            req.headers.authorization = 'Bearer valid.token.here';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(false);

            await authenticateToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith(
                'valid.token.here',
                'your-default-secret-key-change-in-production',
                expect.any(Function)
            );
        });

        test('should skip blacklist check if jti is not present', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                type: 'access'
            };
            req.headers.authorization = 'Bearer valid.token.without.jti';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });

            await authenticateToken(req, res, next);

            expect(securityService.isTokenBlacklisted).not.toHaveBeenCalled();
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('authorizeAdmin', () => {
        test('should call next if user is admin', async () => {
            req.user = {
                id: 99,
                username: 'admin',
                role: 'admin'
            };

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        test('should call next with error if user is not admin', async () => {
            req.user = {
                id: 1,
                username: 'testuser',
                role: 'user'
            };

            await authorizeAdmin(req, res, next);

            expect(logger.warn).toHaveBeenCalledWith(
                `User ${req.user.username} (ID: ${req.user.id}) attempted to access admin-only resource`
            );
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Access denied. Admin privileges required.',
                statusCode: 403
            }));
        });

        test('should call next with error if user role is missing', async () => {
            req.user = {
                id: 1,
                username: 'testuser'
            };

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 403
            }));
        });
    });

    describe('optionalAuth', () => {
        test('should set req.user to null if no token provided', async () => {
            req.headers = {};

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
        });

        test('should set req.user to null if token is invalid', async () => {
            req.headers.authorization = 'Bearer invalid.token';
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
        });

        test('should set req.user to null if token is blacklisted', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                jti: 'blacklisted_jti',
                type: 'access'
            };
            req.headers.authorization = 'Bearer blacklisted.token';
            jwt.verify.mockReturnValue(mockUser);
            securityService.isTokenBlacklisted.mockResolvedValue(true);

            await optionalAuth(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
        });

        test('should set req.user if token is valid', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                jti: 'valid_jti',
                type: 'access'
            };
            req.headers.authorization = 'Bearer valid.token';
            jwt.verify.mockReturnValue(mockUser);
            securityService.isTokenBlacklisted.mockResolvedValue(false);

            await optionalAuth(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Combined: authenticateToken followed by authorizeAdmin', () => {
        test('should allow admin access with non-blacklisted token', async () => {
            const adminUser = { id: 99, username: 'admin', role: 'admin', jti: 'admin_jti', type: 'access' };
            req.headers.authorization = 'Bearer admin.token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, adminUser);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(false);

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(adminUser);
            expect(next).toHaveBeenCalled();

            next.mockClear();

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        test('should deny regular user access to admin endpoint', async () => {
            const regularUser = { id: 1, username: 'testuser', role: 'user', jti: 'user_jti', type: 'access' };
            req.headers.authorization = 'Bearer user.token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, regularUser);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(false);

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(regularUser);
            expect(next).toHaveBeenCalled();

            next.mockClear();

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 403
            }));
        });

        test('should deny access if token is blacklisted', async () => {
            const adminUser = { id: 99, username: 'admin', role: 'admin', jti: 'blacklisted_jti', type: 'access' };
            req.headers.authorization = 'Bearer blacklisted.admin.token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, adminUser);
            });
            securityService.isTokenBlacklisted.mockResolvedValue(true);

            await authenticateToken(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 401,
                message: 'Token has been revoked. Please login again.'
            }));
        });
    });
});
