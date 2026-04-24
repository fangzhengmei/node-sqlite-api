import { deleteBook } from '../../controllers/booksController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('deleteBook controller tests', () => {
    let req;
    let res;
    let regularUser;
    let adminUser;

    beforeEach(() => {
        jest.clearAllMocks();
        regularUser = { id: 1, username: 'testuser', role: 'user' };
        adminUser = { id: 99, username: 'admin', role: 'admin' };
        req = {
            params: { id: 1 },
            user: regularUser
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should delete book if user is the creator', async () => {
        const book = { id: 1, title: 'Test Book', created_by: 1 };
        dbHelper.fetchFirst.mockResolvedValue(book);
        dbHelper.execute.mockResolvedValue();

        await deleteBook(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE id = ?'),
            [1]
        );
        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('DELETE FROM books WHERE id = ?'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book deleted successfully' });
    });

    test('should delete book if user is admin', async () => {
        req.user = adminUser;
        const book = { id: 1, title: 'Test Book', created_by: 5 };
        dbHelper.fetchFirst.mockResolvedValue(book);
        dbHelper.execute.mockResolvedValue();

        await deleteBook(req, res);

        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw 404 if book does not exist', async () => {
        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(deleteBook(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 404
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 403 if user is not the creator and not admin', async () => {
        const book = { id: 1, title: 'Test Book', created_by: 2 };
        dbHelper.fetchFirst.mockResolvedValue(book);

        await expect(deleteBook(req, res)).rejects.toMatchObject({
            message: 'Access denied. You can only delete books you created or have admin privileges.',
            statusCode: 403
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should allow admin to delete legacy book (created_by=null)', async () => {
        req.user = adminUser;
        const book = { id: 1, title: 'Test Book', created_by: null };
        dbHelper.fetchFirst.mockResolvedValue(book);
        dbHelper.execute.mockResolvedValue();

        await deleteBook(req, res);

        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should not allow regular user to delete legacy book (created_by=null)', async () => {
        const book = { id: 1, title: 'Test Book', created_by: null };
        dbHelper.fetchFirst.mockResolvedValue(book);

        await expect(deleteBook(req, res)).rejects.toMatchObject({
            message: 'Access denied. You can only delete books you created or have admin privileges.',
            statusCode: 403
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });
});
