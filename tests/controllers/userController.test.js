import { 
    registerUser, 
    loginUser, 
    getCurrentUser, 
    updateCurrentUser, 
    getAllUsers, 
    deleteUser 
} from '../../controllers/userController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Controller Tests', () => {
    let req;
    let res;
    let regularUser;
    let adminUser;

    beforeEach(() => {
        jest.clearAllMocks();
        regularUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };
        adminUser = { id: 99, username: 'admin', email: 'admin@example.com', role: 'admin' };
        req = {
            body: {},
            params: {},
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
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining(['newuser', 'newuser@example.com'])
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'User registered successfully'
            }));
        });

        test('should throw 409 if email already exists', async () => {
            dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, email: 'newuser@example.com' });

            await expect(registerUser(req, res)).rejects.toMatchObject({
                message: 'User with this email already exists',
                statusCode: 409
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 409 if username already exists', async () => {
            dbHelper.fetchFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 1, username: 'newuser' });

            await expect(registerUser(req, res)).rejects.toMatchObject({
                message: 'User with this username already exists',
                statusCode: 409
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });
    });

    describe('loginUser', () => {
        beforeEach(() => {
            req.body = {
                email: 'test@example.com',
                password: 'Password123'
            };
        });

        test('should login successfully with valid credentials', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'hashed_password',
                role: 'user'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock_jwt_token');

            await loginUser(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT * FROM users WHERE email = ?'),
                ['test@example.com']
            );
            expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed_password');
            expect(jwt.sign).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Login successful',
                token: 'mock_jwt_token'
            }));
        });

        test('should throw 401 if email not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(loginUser(req, res)).rejects.toMatchObject({
                message: 'Invalid email or password',
                statusCode: 401
            });

            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        test('should throw 401 if password is invalid', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'hashed_password',
                role: 'user'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await expect(loginUser(req, res)).rejects.toMatchObject({
                message: 'Invalid email or password',
                statusCode: 401
            });

            expect(jwt.sign).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentUser', () => {
        test('should return current user info', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                created_at: '2025-01-01T00:00:00Z'
            };
            dbHelper.fetchFirst.mockResolvedValue(mockUser);

            await getCurrentUser(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT id, username, email, role, created_at FROM users WHERE id = ?'),
                [1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'User retrieved successfully',
                data: mockUser
            }));
        });

        test('should throw 404 if user not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(getCurrentUser(req, res)).rejects.toMatchObject({
                message: 'User not found',
                statusCode: 404
            });
        });
    });

    describe('updateCurrentUser', () => {
        test('should update user information successfully', async () => {
            req.body = { username: 'newusername' };
            const existingUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com' 
            };
            dbHelper.fetchFirst.mockResolvedValue(existingUser);
            dbHelper.fetchFirst.mockResolvedValueOnce(existingUser);
            dbHelper.fetchFirst.mockResolvedValueOnce(null);
            dbHelper.execute.mockResolvedValue();

            await updateCurrentUser(req, res);

            expect(dbHelper.execute).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'User updated successfully' });
        });

        test('should throw 400 if no fields provided', async () => {
            req.body = {};
            const existingUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com' 
            };
            dbHelper.fetchFirst.mockResolvedValue(existingUser);

            await expect(updateCurrentUser(req, res)).rejects.toMatchObject({
                message: 'At least one field must be provided to update',
                statusCode: 400
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 409 if email already exists', async () => {
            req.body = { email: 'existing@example.com' };
            const existingUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com' 
            };
            dbHelper.fetchFirst.mockResolvedValueOnce(existingUser);
            dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, email: 'existing@example.com' });

            await expect(updateCurrentUser(req, res)).rejects.toMatchObject({
                message: 'User with this email already exists',
                statusCode: 409
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should hash password when updating', async () => {
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
            expect(dbHelper.execute).toHaveBeenCalled();
        });
    });

    describe('getAllUsers', () => {
        test('should return all users for admin', async () => {
            req.user = adminUser;
            const mockUsers = [
                { id: 1, username: 'user1', email: 'user1@example.com', role: 'user' },
                { id: 2, username: 'user2', email: 'user2@example.com', role: 'user' }
            ];
            dbHelper.fetchAll.mockResolvedValue(mockUsers);

            await getAllUsers(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Users retrieved successfully',
                data: mockUsers
            }));
        });

        test('should return 204 if no users found', async () => {
            req.user = adminUser;
            dbHelper.fetchAll.mockResolvedValue([]);

            await getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('deleteUser', () => {
        test('should delete user successfully for admin', async () => {
            req.user = adminUser;
            req.params.id = 2;
            const targetUser = { id: 2, username: 'targetuser' };
            dbHelper.fetchFirst.mockResolvedValue(targetUser);
            dbHelper.execute.mockResolvedValue();

            await deleteUser(req, res);

            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('DELETE FROM users WHERE id = ?'),
                [2]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'User deleted successfully' });
        });

        test('should throw 400 if admin tries to delete own account', async () => {
            req.user = adminUser;
            req.params.id = 99;

            await expect(deleteUser(req, res)).rejects.toMatchObject({
                message: 'You cannot delete your own account',
                statusCode: 400
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 404 if user not found', async () => {
            req.user = adminUser;
            req.params.id = 999;
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(deleteUser(req, res)).rejects.toMatchObject({
                message: 'User not found',
                statusCode: 404
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });
    });
});
