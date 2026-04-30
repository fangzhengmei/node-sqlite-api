import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let getSingleDeletedBook;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('getSingleDeletedBook unit test', () => {
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        
        mockFetchFirst = jest.fn();
        mockFetchAll = jest.fn();
        mockExecute = jest.fn();
        
        jest.doMock('../../utils/dbRunMethodWrapper.js', () => ({
            __esModule: true,
            fetchFirst: mockFetchFirst,
            fetchAll: mockFetchAll,
            execute: mockExecute
        }));
        
        const booksModule = await import('../../controllers/booksController.js');
        getSingleDeletedBook = booksModule.getSingleDeletedBook;

        req = { params: { id: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return a single deleted book with author info', async () => {
        mockFetchFirst.mockResolvedValue({
            author_id: 1,
            name: 'Test Author',
            email: 'test@test.com',
            author_created_at: '2025-09-12 06:47:02',
            book_id: 1,
            title: 'Test Book',
            isbn: '1234567890',
            published_year: 2020,
            book_created_at: '2025-09-12 06:47:02',
            deleted_at: '2025-09-13 06:47:02'
        });

        await getSingleDeletedBook(req, res);

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE books.id = ? AND books.deleted_at IS NOT NULL'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'deleted book retreived sucessfully',
            data: expect.objectContaining({
                title: 'Test Book',
                isbn: '1234567890',
                deleted_at: '2025-09-13 06:47:02'
            })
        }));
    });

    test('should return 404 when deleted book does not exist', async () => {
        mockFetchFirst.mockResolvedValue(null);

        await expect(getSingleDeletedBook(req, res)).rejects.toMatchObject({
            message: 'No deleted book with id 1 exists in the books table',
            statusCode: 404
        });
    });
});
