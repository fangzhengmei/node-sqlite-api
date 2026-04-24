import * as securityService from '../../utils/securityService.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';
import crypto from 'crypto';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Security Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MAX_LOGIN_ATTEMPTS = '5';
        process.env.LOCK_DURATION_MINUTES = '30';
        process.env.RATE_LIMIT_WINDOW_MINUTES = '15';
        process.env.MAX_REQUESTS_PER_WINDOW = '100';
    });

    describe('generateJti', () => {
        test('should generate a valid UUID v4', () => {
            const jti = securityService.generateJti();
            
            expect(jti).toBeDefined();
            expect(typeof jti).toBe('string');
            expect(jti.length).toBeGreaterThan(0);
        });

        test('should generate unique jti each time', () => {
            const jti1 = securityService.generateJti();
            const jti2 = securityService.generateJti();
            
            expect(jti1).not.toBe(jti2);
        });
    });

    describe('recordLoginAttempt', () => {
        test('should record successful login attempt', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.recordLoginAttempt('192.168.1.1', 'test@example.com', true);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO login_attempts'),
                ['192.168.1.1', 'test@example.com', 1]
            );
        });

        test('should record failed login attempt', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.recordLoginAttempt('192.168.1.1', 'test@example.com', false);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO login_attempts'),
                ['192.168.1.1', 'test@example.com', 0]
            );
        });
    });

    describe('getFailedLoginAttempts', () => {
        test('should return number of failed login attempts within lock window', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ count: 3 });
            
            const count = await securityService.getFailedLoginAttempts('test@example.com');
            
            expect(count).toBe(3);
            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('created_at > ?'),
                expect.arrayContaining(['test@example.com'])
            );
        });

        test('should return 0 when no failed attempts found', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ count: 0 });
            
            const count = await securityService.getFailedLoginAttempts('test@example.com');
            
            expect(count).toBe(0);
        });

        test('should return 0 when fetchFirst returns null', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            const count = await securityService.getFailedLoginAttempts('test@example.com');
            
            expect(count).toBe(0);
        });
    });

    describe('incrementFailedLogin', () => {
        test('should increment failed login attempts counter', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.incrementFailedLogin(1);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('failed_login_attempts = failed_login_attempts + 1'),
                [1]
            );
        });
    });

    describe('resetFailedLogin', () => {
        test('should reset failed login attempts and update last_login_at', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.resetFailedLogin(1);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('failed_login_attempts = 0'),
                expect.arrayContaining([1])
            );
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('last_login_at'),
                expect.arrayContaining([1])
            );
        });
    });

    describe('lockUser', () => {
        test('should set locked_until to future timestamp', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.lockUser(1);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('locked_until'),
                [1]
            );
        });
    });

    describe('isUserLocked', () => {
        test('should return true if user is currently locked', async () => {
            const futureDate = new Date(Date.now() + 3600000).toISOString();
            const user = { id: 1, username: 'testuser', locked_until: futureDate };
            
            const isLocked = await securityService.isUserLocked(user);
            
            expect(isLocked).toBe(true);
            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should return false and unlock if lock has expired', async () => {
            const pastDate = new Date(Date.now() - 3600000).toISOString();
            const user = { id: 1, username: 'testuser', locked_until: pastDate };
            dbHelper.execute.mockResolvedValue();
            
            const isLocked = await securityService.isUserLocked(user);
            
            expect(isLocked).toBe(false);
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('locked_until = NULL'),
                [1]
            );
        });

        test('should return false if locked_until is null', async () => {
            const user = { id: 1, username: 'testuser', locked_until: null };
            
            const isLocked = await securityService.isUserLocked(user);
            
            expect(isLocked).toBe(false);
        });

        test('should return false if locked_until is undefined', async () => {
            const user = { id: 1, username: 'testuser' };
            
            const isLocked = await securityService.isUserLocked(user);
            
            expect(isLocked).toBe(false);
        });
    });

    describe('checkRateLimit', () => {
        test('should return allowed when under rate limit', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ count: 50 });
            
            const result = await securityService.checkRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(true);
            expect(result.current).toBe(50);
            expect(result.limit).toBe(100);
        });

        test('should return not allowed when over rate limit', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ count: 150 });
            
            const result = await securityService.checkRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(false);
            expect(result.current).toBe(150);
        });

        test('should return 0 when no attempts found', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ count: 0 });
            
            const result = await securityService.checkRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(true);
            expect(result.current).toBe(0);
        });
    });

    describe('checkLoginSecurity', () => {
        test('should return allowed when all security checks pass', async () => {
            const user = { id: 1, username: 'testuser', locked_until: null };
            
            securityService.checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
            securityService.isUserLocked = jest.fn().mockResolvedValue(false);
            securityService.getFailedLoginAttempts = jest.fn().mockResolvedValue(2);
            
            const result = await securityService.checkLoginSecurity('192.168.1.1', 'test@example.com', user);
            
            expect(result.allowed).toBe(true);
        });

        test('should return not allowed when rate limit exceeded', async () => {
            const user = { id: 1, username: 'testuser', locked_until: null };
            
            securityService.checkRateLimit = jest.fn().mockResolvedValue({ 
                allowed: false, 
                current: 150, 
                limit: 100,
                windowMinutes: 15
            });
            securityService.isUserLocked = jest.fn().mockResolvedValue(false);
            
            const result = await securityService.checkLoginSecurity('192.168.1.1', 'test@example.com', user);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('rate_limit');
            expect(result.message).toContain('Too many login attempts');
        });

        test('should return not allowed when user is locked', async () => {
            const user = { id: 1, username: 'testuser' };
            
            securityService.checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
            securityService.isUserLocked = jest.fn().mockResolvedValue(true);
            
            const result = await securityService.checkLoginSecurity('192.168.1.1', 'test@example.com', user);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('locked');
        });

        test('should lock user when failed attempts exceed max', async () => {
            const user = { id: 1, username: 'testuser', locked_until: null };
            
            securityService.checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
            securityService.isUserLocked = jest.fn().mockResolvedValue(false);
            securityService.getFailedLoginAttempts = jest.fn().mockResolvedValue(10);
            securityService.lockUser = jest.fn().mockResolvedValue();
            
            const result = await securityService.checkLoginSecurity('192.168.1.1', 'test@example.com', user);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('locked');
            expect(securityService.lockUser).toHaveBeenCalledWith(1);
        });

        test('should return allowed when user is null (new email)', async () => {
            securityService.checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
            securityService.getFailedLoginAttempts = jest.fn().mockResolvedValue(2);
            
            const result = await securityService.checkLoginSecurity('192.168.1.1', 'nonexistent@example.com', null);
            
            expect(result.allowed).toBe(true);
        });
    });

    describe('Token Blacklist', () => {
        test('should blacklist a token', async () => {
            dbHelper.execute.mockResolvedValue();
            
            await securityService.blacklistToken('jti_123', 1, '2025-10-01T00:00:00Z');
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO token_blacklist'),
                ['jti_123', 1, '2025-10-01T00:00:00Z']
            );
        });

        test('isTokenBlacklisted should return true for blacklisted token', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ id: 1 });
            
            const isBlacklisted = await securityService.isTokenBlacklisted('jti_blacklisted');
            
            expect(isBlacklisted).toBe(true);
        });

        test('isTokenBlacklisted should return false for non-blacklisted token', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            const isBlacklisted = await securityService.isTokenBlacklisted('jti_valid');
            
            expect(isBlacklisted).toBe(false);
        });

        test('cleanupExpiredBlacklist should delete expired tokens', async () => {
            dbHelper.execute.mockResolvedValue({ changes: 5 });
            
            await securityService.cleanupExpiredBlacklist();
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('DELETE FROM token_blacklist'),
                expect.anything()
            );
        });
    });

    describe('Refresh Token Management', () => {
        test('should create a refresh token', async () => {
            dbHelper.execute.mockResolvedValue();
            process.env.REFRESH_TOKEN_EXPIRY_DAYS = '7';
            
            const result = await securityService.createRefreshToken(1);
            
            expect(result.token).toBeDefined();
            expect(result.jti).toBeDefined();
            expect(result.expiresAt).toBeDefined();
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO refresh_tokens'),
                expect.arrayContaining([1])
            );
        });

        describe('validateRefreshToken', () => {
            test('should return valid token with user info', async () => {
                const mockToken = {
                    id: 1,
                    user_id: 1,
                    token: 'valid_refresh_token',
                    jti: 'jti_123',
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    revoked: 0,
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user'
                };
                dbHelper.fetchFirst.mockResolvedValue(mockToken);
                
                const result = await securityService.validateRefreshToken('valid_refresh_token');
                
                expect(result.valid).toBe(true);
                expect(result.user.id).toBe(1);
                expect(result.jti).toBe('jti_123');
            });

            test('should return not found if token does not exist', async () => {
                dbHelper.fetchFirst.mockResolvedValue(null);
                
                const result = await securityService.validateRefreshToken('nonexistent_token');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe('not_found');
            });

            test('should return revoked if token is revoked', async () => {
                const mockToken = {
                    id: 1,
                    user_id: 1,
                    token: 'revoked_token',
                    jti: 'jti_456',
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    revoked: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user'
                };
                dbHelper.fetchFirst.mockResolvedValue(mockToken);
                
                const result = await securityService.validateRefreshToken('revoked_token');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe('revoked');
            });

            test('should return expired if token has expired', async () => {
                const mockToken = {
                    id: 1,
                    user_id: 1,
                    token: 'expired_token',
                    jti: 'jti_789',
                    expires_at: new Date(Date.now() - 86400000).toISOString(),
                    revoked: 0,
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user'
                };
                dbHelper.fetchFirst.mockResolvedValue(mockToken);
                
                const result = await securityService.validateRefreshToken('expired_token');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe('expired');
            });
        });

        test('should revoke a single refresh token', async () => {
            dbHelper.execute.mockResolvedValue({ changes: 1 });
            
            await securityService.revokeRefreshToken('token_to_revoke');
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SET revoked = 1'),
                ['token_to_revoke']
            );
        });

        test('should revoke all user refresh tokens', async () => {
            dbHelper.execute.mockResolvedValue({ changes: 3 });
            
            await securityService.revokeAllUserRefreshTokens(1);
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('user_id = ?'),
                [1]
            );
        });

        test('should cleanup expired refresh tokens', async () => {
            dbHelper.execute.mockResolvedValue({ changes: 10 });
            
            await securityService.cleanupExpiredRefreshTokens();
            
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('DELETE FROM refresh_tokens'),
                expect.anything()
            );
        });
    });
});
