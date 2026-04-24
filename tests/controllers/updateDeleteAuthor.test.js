import { updateAuthor, deleteAuthor } from '../../controllers/authorController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Author Update and Delete Tests', () => {
    let req;
    let res;
    let regularUser;
    let adminUser;

    beforeEach(() => {
        jest.clearAllMocks();
        regularUser = { id: 1, username: 'testuser', role: 'user' };
        adminUser = { id: 99, username: 'admin', role: 'admin' };
        req = {
            params: { authorId: 1 },
            body: {},
            user: regularUser
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('updateAuthor', () => {
        test('should update author if user is the creator', async () => {
            req.body = { name: 'New Name' };
            const author = { id: 1, name: 'Old Name', email: 'old@example.com', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(null);
            dbHelper.execute.mockResolvedValue();

            await updateAuthor(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT * FROM authors WHERE id = ?'),
                [1]
            );
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('UPDATE authors SET name = ?'),
                ['New Name', 1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'Author updated successfully' });
        });

        test('should update author if user is admin', async () => {
            req.user = adminUser;
            req.body = { name: 'New Name' };
            const author = { id: 1, name: 'Old Name', created_by: 5 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(null);
            dbHelper.execute.mockResolvedValue();

            await updateAuthor(req, res);

            expect(dbHelper.execute).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should throw 404 if author does not exist', async () => {
            req.body = { name: 'New Name' };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(updateAuthor(req, res)).rejects.toMatchObject({
                message: 'No such author with id 1 exists in the authors table',
                statusCode: 404
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 403 if user is not the creator and not admin', async () => {
            req.body = { name: 'New Name' };
            const author = { id: 1, name: 'Old Name', created_by: 2 };
            dbHelper.fetchFirst.mockResolvedValue(author);

            await expect(updateAuthor(req, res)).rejects.toMatchObject({
                message: 'Access denied. You can only modify authors you created or have admin privileges.',
                statusCode: 403
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 400 if no fields provided', async () => {
            req.body = {};
            const author = { id: 1, name: 'Old Name', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(author);

            await expect(updateAuthor(req, res)).rejects.toMatchObject({
                message: 'At least one field must be provided to update',
                statusCode: 400
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 409 if email already exists', async () => {
            req.body = { email: 'existing@example.com' };
            const author = { id: 1, name: 'Old Name', email: 'old@example.com', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, email: 'existing@example.com' });

            await expect(updateAuthor(req, res)).rejects.toMatchObject({
                message: 'Author with this email already exists',
                statusCode: 409
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });
    });

    describe('deleteAuthor', () => {
        test('should delete author if user is the creator and author has no books', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce({ count: 0 });
            dbHelper.execute.mockResolvedValue();

            await deleteAuthor(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT COUNT(*) as count FROM books WHERE author_id = ?'),
                [1]
            );
            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('DELETE FROM authors WHERE id = ?'),
                [1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'Author deleted successfully' });
        });

        test('should delete author if user is admin', async () => {
            req.user = adminUser;
            const author = { id: 1, name: 'Test Author', created_by: 5 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce({ count: 0 });
            dbHelper.execute.mockResolvedValue();

            await deleteAuthor(req, res);

            expect(dbHelper.execute).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should throw 404 if author does not exist', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(deleteAuthor(req, res)).rejects.toMatchObject({
                message: 'No such author with id 1 exists in the authors table',
                statusCode: 404
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 403 if user is not the creator and not admin', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 2 };
            dbHelper.fetchFirst.mockResolvedValue(author);

            await expect(deleteAuthor(req, res)).rejects.toMatchObject({
                message: 'Access denied. You can only delete authors you created or have admin privileges.',
                statusCode: 403
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should throw 400 if author has books', async () => {
            const author = { id: 1, name: 'Test Author', created_by: 1 };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce({ count: 3 });

            await expect(deleteAuthor(req, res)).rejects.toMatchObject({
                message: 'Cannot delete author: they have 3 book(s). Please delete the books first.',
                statusCode: 400
            });

            expect(dbHelper.execute).not.toHaveBeenCalled();
        });

        test('should allow admin to delete legacy author (created_by=null) with no books', async () => {
            req.user = adminUser;
            const author = { id: 1, name: 'Test Author', created_by: null };
            dbHelper.fetchFirst.mockResolvedValue(author);
            dbHelper.fetchFirst.mockResolvedValueOnce(author);
            dbHelper.fetchFirst.mockResolvedValueOnce({ count: 0 });
            dbHelper.execute.mockResolvedValue();

            await deleteAuthor(req, res);

            expect(dbHelper.execute).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
