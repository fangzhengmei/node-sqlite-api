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
} from '../../controllers/userController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';
import * as securityService from '../../utils/securityService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../utils/securityService.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Controller Tests (Updated for Security Features)', () => {
    let req;
    let res;
    let regularUser;
    let adminUser;
    let mockAccessToken;
    let mockRefreshToken;

    beforeEach(() => {
        jest.clearAllMocks();
        regularUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user', failed_login_attempts: 0, locked_until: null };
        adminUser = { id: 99, username: 'admin', email: 'admin@example.com', role: 'admin', failed_login_attempts: 0, locked_until: null };
        mockAccessToken = 'mock_access_token_jwt';
        mockRefreshToken = 'mock_refresh_token_jwt';
        req = {
            body: {},
            params: {},
            headers: {},
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            user: regularUser
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('registerUser', () => {
        beforeEach(() => {
            req.body = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'Password123'
            };
        });

        test('should register a new user successfully', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            dbHelper.execute.mockResolvedValue();

            await registerUser(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledTimes(2);
            expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should throw 409 if email already exists', async () => {
            dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, email: 'newuser@example.com' });

            await expect(registerUser(req, res)).rejects.toMatchObject({
                message: 'User with this email already exists',
                statusCode: 409
            });
        });
    });

    describe('loginUser', () => {
        beforeEach(() => {
            req.body = {
                email: 'test@example.com',
                password: 'Password123'
            };
            securityService.checkLoginSecurity.mockResolvedValue({ allowed: true });
        });

        test('should login successfully with valid credentials (returns accessToken and refreshToken)', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'hashed_password',
                role: 'user'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            
            securityService.createRefreshToken.mockResolvedValue({
                token: 'database_refresh_token',
                jti: 'refresh_jti_123',
                expiresAt: '2025-10-01T00:00:00Z'
            });
            jwt.sign
                .mockReturnValueOnce(mockAccessToken)
                .mockReturnValueOnce(mockRefreshToken);
            jwt.decode.mockReturnValue({ exp: Date.now() + 900000 });

            await loginUser(req, res);

            expect(securityService.checkLoginSecurity).toHaveBeenCalled();
            expect(securityService.recordLoginAttempt).toHaveBeenCalledWith(
                '127.0.0.1',
                'test@example.com',
                true
            );
            expect(securityService.resetFailedLogin).toHaveBeenCalledWith(1);
            expect(jwt.sign).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Login successful',
                accessToken: mockAccessToken,
                refreshToken: mockRefreshToken
            }));
        });

        test('should throw 429 if rate limit or account locked', async () => {
            securityService.checkLoginSecurity.mockResolvedValue({
                allowed: false,
                reason: 'locked',
                message: 'Account is temporarily locked'
            });

            await expect(loginUser(req, res)).rejects.toMatchObject({
                message: 'Account is temporarily locked',
                statusCode: 429
            });

            expect(securityService.recordLoginAttempt).toHaveBeenCalledWith(
                '127.0.0.1',
                'test@example.com',
                false
            );
        });

        test('should throw 401 if email not found and record failed attempt', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(loginUser(req, res)).rejects.toMatchObject({
                message: 'Invalid email or password',
                statusCode: 401
            });

            expect(securityService.recordLoginAttempt).toHaveBeenCalledWith(
                '127.0.0.1',
                'test@example.com',
                false
            );
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should throw 401 if password is invalid and increment failed count', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'hashed_password',
                role: 'user'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            securityService.getFailedLoginAttempts.mockResolvedValue(2);

            await expect(loginUser(req, res)).rejects.toMatchObject({
                message: expect.stringContaining('Invalid email or password'),
                statusCode: 401
            });

            expect(securityService.recordLoginAttempt).toHaveBeenCalledWith(
                '127.0.0.1',
                'test@example.com',
                false
            );
            expect(securityService.incrementFailedLogin).toHaveBeenCalledWith(1);
        });
    });

    describe('logoutUser', () => {
        beforeEach(() => {
            req.headers.authorization = 'Bearer mock_access_token';
            req.user = regularUser;
        });

        test('should logout successfully by blacklisting access token', async () => {
            const decodedToken = { jti: 'jti_123', exp: Date.now() / 1000 + 900, id: 1 };
            jwt.verify.mockReturnValue(decodedToken);
            req.body = {};

            await logoutUser(req, res);

            expect(jwt.verify).toHaveBeenCalledWith(
                'mock_access_token',
                expect.any(String)
            );
            expect(securityService.blacklistToken).toHaveBeenCalledWith(
                'jti_123',
                1,
                expect.any(String)
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'Logged out successfully' });
        });

        test('should also revoke refresh token if provided', async () => {
            const decodedToken = { jti: 'jti_123', exp: Date.now() / 1000 + 900, id: 1 };
            jwt.verify.mockReturnValue(decodedToken);
            req.body = { refreshToken: 'mock_refresh_token' };

            await logoutUser(req, res);

            expect(securityService.blacklistToken).toHaveBeenCalled();
            expect(securityService.revokeRefreshToken).toHaveBeenCalledWith('mock_refresh_token');
        });

        test('should handle invalid token gracefully during logout', async () => {
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            req.body = {};

            await logoutUser(req, res);

            expect(securityService.blacklistToken).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('refreshAccessToken', () => {
        beforeEach(() => {
            req.body = { refreshToken: 'mock_jwt_refresh_token' };
        });

        test('should refresh access token successfully', async () => {
            const decodedJwt = { 
                jti: 'jti_456', 
                id: 1, 
                token: 'database_refresh_token' 
            };
            const validatedUser = {
                valid: true,
                user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
                jti: 'jti_456'
            };
            
            jwt.verify.mockReturnValue(decodedJwt);
            securityService.validateRefreshToken.mockResolvedValue(validatedUser);
            securityService.createRefreshToken.mockResolvedValue({
                token: 'new_database_refresh_token',
                jti: 'new_jti_789',
                expiresAt: '2025-10-01T00:00:00Z'
            });
            jwt.sign
                .mockReturnValueOnce('new_access_token')
                .mockReturnValueOnce('new_refresh_token_jwt');
            jwt.decode.mockReturnValue({ exp: Date.now() + 900000 });

            await refreshAccessToken(req, res);

            expect(jwt.verify).toHaveBeenCalledWith(
                'mock_jwt_refresh_token',
                expect.any(String)
            );
            expect(securityService.validateRefreshToken).toHaveBeenCalledWith('database_refresh_token');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Token refreshed successfully',
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token_jwt'
            }));
        });

        test('should throw 400 if refresh token not provided', async () => {
            req.body = {};

            await expect(refreshAccessToken(req, res)).rejects.toMatchObject({
                message: 'Refresh token is required',
                statusCode: 400
            });
        });

        test('should throw 401 if refresh token is invalid', async () => {
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(refreshAccessToken(req, res)).rejects.toMatchObject({
                message: 'Invalid or expired refresh token',
                statusCode: 401
            });
        });

        test('should throw 401 if refresh token is revoked or expired', async () => {
            const decodedJwt = { 
                jti: 'jti_456', 
                id: 1, 
                token: 'database_refresh_token' 
            };
            jwt.verify.mockReturnValue(decodedJwt);
            securityService.validateRefreshToken.mockResolvedValue({
                valid: false,
                reason: 'revoked'
            });

            await expect(refreshAccessToken(req, res)).rejects.toMatchObject({
                message: 'Invalid or expired refresh token',
                statusCode: 401
            });
        });
    });

    describe('getCurrentUser', () => {
        test('should return current user info including last_login_at', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                created_at: '2025-01-01T00:00:00Z',
                last_login_at: '2025-09-15T10:30:00Z'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);

            await getCurrentUser(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('last_login_at'),
                [1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ last_login_at: '2025-09-15T10:30:00Z' })
            }));
        });
    });

    describe('updateCurrentUser', () => {
        test('should revoke all refresh tokens when password is changed', async () => {
            req.body = { password: 'NewPassword123' };
            const existingUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com' 
            };
            dbHelper.fetchFirst.mockResolvedValue(existingUser);
            bcrypt.hash.mockResolvedValue('new_hashed_password');
            dbHelper.execute.mockResolvedValue();

            await updateCurrentUser(req, res);

            expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
            expect(securityService.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'User updated successfully',
                info: 'Password changed. Please login again with new password.'
            }));
        });

        test('should not revoke tokens when updating non-password fields', async () => {
            req.body = { username: 'newname' };
            const existingUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com' 
            };
            dbHelper.fetchFirst.mockResolvedValue(existingUser);
            dbHelper.execute.mockResolvedValue();

            await updateCurrentUser(req, res);

            expect(securityService.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({
                info: expect.anything()
            }));
        });
    });

    describe('getAllUsers', () => {
        test('should return all users with security info for admin', async () => {
            req.user = adminUser;
            const mockUsers = [
                { 
                    id: 1, 
                    username: 'user1', 
                    email: 'user1@example.com', 
                    role: 'user',
                    failed_login_attempts: 2,
                    locked_until: null,
                    last_login_at: '2025-09-15T10:30:00Z'
                }
            ];
            dbHelper.fetchAll.mockResolvedValue(mockUsers);

            await getAllUsers(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('failed_login_attempts'),
                expect.anything()
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('lockUserAccount', () => {
        test('should lock user account and revoke all tokens (admin only)', async () => {
            req.user = adminUser;
            req.params.id = 2;
            req.body = { lockDuration: 60 };
            const targetUser = { id: 2, username: 'targetuser', email: 'target@example.com' };
            dbHelper.fetchFirst.mockResolvedValue(targetUser);
            dbHelper.execute.mockResolvedValue();

            await lockUserAccount(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(dbHelper.execute).toHaveBeenCalledTimes(2);
            expect(securityService.revokeAllUserRefreshTokens).toHaveBeenCalledWith(2);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should throw 404 if user not found', async () => {
            req.user = adminUser;
            req.params.id = 999;
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(lockUserAccount(req, res)).rejects.toMatchObject({
                message: 'User not found',
                statusCode: 404
            });
        });
    });

    describe('unlockUserAccount', () => {
        test('should unlock user account (admin only)', async () => {
            req.user = adminUser;
            req.params.id = 2;
            const targetUser = { id: 2, username: 'targetuser', email: 'target@example.com' };
            dbHelper.fetchFirst.mockResolvedValue(targetUser);
            dbHelper.execute.mockResolvedValue();

            await unlockUserAccount(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('locked_until = NULL'),
                [2]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'User unlocked successfully' });
        });

        test('should throw 404 if user not found', async () => {
            req.user = adminUser;
            req.params.id = 999;
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(unlockUserAccount(req, res)).rejects.toMatchObject({
                message: 'User not found',
                statusCode: 404
            });
        });
    });

    describe('deleteUser', () => {
        test('should revoke all refresh tokens before deleting user', async () => {
            req.user = adminUser;
            req.params.id = 2;
            const targetUser = { id: 2, username: 'targetuser' };
            dbHelper.fetchFirst.mockResolvedValue(targetUser);
            dbHelper.execute.mockResolvedValue();

            await deleteUser(req, res);

            expect(securityService.revokeAllUserRefreshTokens).toHaveBeenCalledWith(2);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
