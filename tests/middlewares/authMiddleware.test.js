import jwt from 'jsonwebtoken';
import { authenticateToken, authorizeAdmin } from '../../middlewares/authMiddleware.js';
import { logger } from '../../logger/logger.js';

jest.mock('jsonwebtoken');
jest.mock('../../logger/logger.js', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn()
    }
}));

describe('Auth Middleware Tests', () => {
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

        test('should set req.user and call next if token is valid', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user'
            };
            req.headers.authorization = 'Bearer valid.token.here';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(logger.info).toHaveBeenCalledWith(
                `User authenticated: ${mockUser.username} (ID: ${mockUser.id})`
            );
            expect(next).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        test('should use default secret if JWT_SECRET not set', async () => {
            delete process.env.JWT_SECRET;
            const mockUser = { id: 1, username: 'testuser', role: 'user' };
            req.headers.authorization = 'Bearer valid.token.here';
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });

            await authenticateToken(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith(
                'valid.token.here',
                'your-default-secret-key-change-in-production',
                expect.any(Function)
            );
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

    describe('Combined: authenticateToken followed by authorizeAdmin', () => {
        test('should allow admin access', async () => {
            const adminUser = { id: 99, username: 'admin', role: 'admin' };
            req.headers.authorization = 'Bearer admin.token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, adminUser);
            });

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(adminUser);
            expect(next).toHaveBeenCalled();

            next.mockClear();

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        test('should deny regular user access to admin endpoint', async () => {
            const regularUser = { id: 1, username: 'testuser', role: 'user' };
            req.headers.authorization = 'Bearer user.token';
            
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, regularUser);
            });

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(regularUser);
            expect(next).toHaveBeenCalled();

            next.mockClear();

            await authorizeAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 403
            }));
        });
    });
});
