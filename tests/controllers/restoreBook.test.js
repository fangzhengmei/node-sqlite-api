import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let restoreBook;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('restoreBook unit test', () => {
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
        restoreBook = booksModule.restoreBook;

        req = { params: { id: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should restore a deleted book when author is not deleted', async () => {
        mockFetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', author_id: 1, deleted_at: '2025-09-13 06:47:02' })
            .mockResolvedValueOnce({ id: 1, name: 'Test Author', email: 'test@test.com' });
        mockExecute.mockResolvedValue();

        await restoreBook(req, res);

        expect(mockFetchFirst).toHaveBeenCalledTimes(2);
        expect(mockFetchFirst).toHaveBeenNthCalledWith(1,
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE id = ? AND deleted_at IS NOT NULL'),
            [1]
        );
        expect(mockFetchFirst).toHaveBeenNthCalledWith(2,
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE id = ? AND deleted_at IS NULL'),
            [1]
        );
        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = NULL'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book restored successfully' });
    });

    test('should return 404 when deleted book does not exist', async () => {
        mockFetchFirst.mockResolvedValue(null);

        await expect(restoreBook(req, res)).rejects.toMatchObject({
            message: 'Deleted book with the given id 1 does not exist',
            statusCode: 404
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });

    test('should return 400 when author is also deleted', async () => {
        mockFetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', author_id: 1, deleted_at: '2025-09-13 06:47:02' })
            .mockResolvedValueOnce(null);

        await expect(restoreBook(req, res)).rejects.toMatchObject({
            message: 'Cannot restore book because its author is also deleted. Please restore the author first.',
            statusCode: 400
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });
});
