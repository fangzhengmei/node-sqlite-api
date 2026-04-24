import { canModifyResource, checkBookPermission, checkAuthorPermission } from '../../utils/permissionChecker.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Permission Checker Tests', () => {
    
    describe('canModifyResource', () => {
        let regularUser;
        let adminUser;

        beforeEach(() => {
            regularUser = { id: 1, username: 'testuser', role: 'user' };
            adminUser = { id: 99, username: 'admin', role: 'admin' };
        });

        test('should return true for admin user regardless of created_by', () => {
            const resource = { id: 1, created_by: 5 };
            
            expect(canModifyResource(adminUser, resource)).toBe(true);
        });

        test('should return true for user who created the resource', () => {
            const resource = { id: 1, created_by: 1 };
            
            expect(canModifyResource(regularUser, resource)).toBe(true);
        });

        test('should return false for user who did not create the resource', () => {
            const resource = { id: 1, created_by: 2 };
            
            expect(canModifyResource(regularUser, resource)).toBe(false);
        });

        test('should return false when created_by is null (legacy data)', () => {
            const resource = { id: 1, created_by: null };
            
            expect(canModifyResource(regularUser, resource)).toBe(false);
        });

        test('should return false when created_by is undefined (legacy data)', () => {
            const resource = { id: 1 };
            
            expect(canModifyResource(regularUser, resource)).toBe(false);
        });

        test('should return true for admin when created_by is null', () => {
            const resource = { id: 1, created_by: null };
            
            expect(canModifyResource(adminUser, resource)).toBe(true);
        });

        test('should return false when user is null', () => {
            const resource = { id: 1, created_by: 1 };
            
            expect(canModifyResource(null, resource)).toBe(false);
        });
    });

    describe('checkBookPermission', () => {
        let regularUser;
        let adminUser;

        beforeEach(() => {
            jest.clearAllMocks();
            regularUser = { id: 1, username: 'testuser', role: 'user' };
            adminUser = { id: 99, username: 'admin', role: 'admin' };
        });

        test('should return not found error when book does not exist', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            const result = await checkBookPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
            expect(result.book).toBeNull();
            expect(result.error).toBe('Book not found');
        });

        test('should allow admin to modify any book', async () => {
            const book = { id: 1, title: 'Test Book', created_by: 5 };
            dbHelper.fetchFirst.mockResolvedValue(book);
            
            const result = await checkBookPermission(1, adminUser);
            
            expect(result.allowed).toBe(true);
            expect(result.book).toEqual(book);
            expect(result.error).toBeNull();
        });

        test('should allow creator to modify their own book', async () => {
            const book = { id: 1, title: 'Test Book', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(book);
            
            const result = await checkBookPermission(1, regularUser);
            
            expect(result.allowed).toBe(true);
            expect(result.book).toEqual(book);
        });

        test('should not allow non-creator to modify book', async () => {
            const book = { id: 1, title: 'Test Book', created_by: 2 };
            dbHelper.fetchFirst.mockResolvedValue(book);
            
            const result = await checkBookPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
            expect(result.error).toBeNull();
        });

        test('should not allow regular user to modify legacy book (created_by=null)', async () => {
            const book = { id: 1, title: 'Test Book', created_by: null };
            dbHelper.fetchFirst.mockResolvedValue(book);
            
            const result = await checkBookPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
        });

        test('should allow admin to modify legacy book (created_by=null)', async () => {
            const book = { id: 1, title: 'Test Book', created_by: null };
            dbHelper.fetchFirst.mockResolvedValue(book);
            
            const result = await checkBookPermission(1, adminUser);
            
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkAuthorPermission', () => {
        let regularUser;
        let adminUser;

        beforeEach(() => {
            jest.clearAllMocks();
            regularUser = { id: 1, username: 'testuser', role: 'user' };
            adminUser = { id: 99, username: 'admin', role: 'admin' };
        });

        test('should return not found error when author does not exist', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            const result = await checkAuthorPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
            expect(result.author).toBeNull();
            expect(result.error).toBe('Author not found');
        });

        test('should allow admin to modify any author', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 5 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            
            const result = await checkAuthorPermission(1, adminUser);
            
            expect(result.allowed).toBe(true);
            expect(result.author).toEqual(author);
            expect(result.error).toBeNull();
        });

        test('should allow creator to modify their own author', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            
            const result = await checkAuthorPermission(1, regularUser);
            
            expect(result.allowed).toBe(true);
            expect(result.author).toEqual(author);
        });

        test('should not allow non-creator to modify author', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 2 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            
            const result = await checkAuthorPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
        });

        test('should not allow regular user to modify legacy author (created_by=null)', async () => {
            const author = { id: 1, name: 'Test Author', created_by: null };
            dbHelper.fetchFirst.mockResolvedValue(author);
            
            const result = await checkAuthorPermission(1, regularUser);
            
            expect(result.allowed).toBe(false);
        });

        test('should allow admin to modify legacy author (created_by=null)', async () => {
            const author = { id: 1, name: 'Test Author', created_by: null };
            dbHelper.fetchFirst.mockResolvedValue(author);
            
            const result = await checkAuthorPermission(1, adminUser);
            
            expect(result.allowed).toBe(true);
        });
    });
});
