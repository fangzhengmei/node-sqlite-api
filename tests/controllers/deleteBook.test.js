import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let deleteBook;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('deleteBook unit test', () => {
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        
        mockFetchFirst = jest.fn();
        mockFetchAll = jest.fn();
        mockExecute = jest.fn();
        
        await jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
            __esModule: true,
            fetchFirst: mockFetchFirst,
            fetchAll: mockFetchAll,
            execute: mockExecute
        }));
        
        const booksModule = await import('../../controllers/booksController.js');
        deleteBook = booksModule.deleteBook;

        req = { params: { id: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should soft delete an existing book', async () => {
        mockFetchFirst.mockResolvedValue({ id: 1, title: 'Test Book', isbn: '1234567890' });
        mockExecute.mockResolvedValue();

        await deleteBook(req, res);

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE id = ? AND deleted_at IS NULL'),
            [1]
        );
        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = CURRENT_TIMESTAMP'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book deleted successfully' });
    });

    test('should return 404 when book does not exist', async () => {
        mockFetchFirst.mockResolvedValue(null);

        await expect(deleteBook(req, res)).rejects.toMatchObject({
            message: 'Book with the given id 1 does not exist',
            statusCode: 404
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });
});
