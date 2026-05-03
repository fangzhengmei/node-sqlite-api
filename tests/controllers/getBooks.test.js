import { jest, expect, describe, test, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
  fetchFirst: jest.fn(),
  fetchAll: jest.fn(),
  execute: jest.fn()
}));

jest.unstable_mockModule('../../config/connDB.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../../logger/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule('../../utils/asyncWrapper.js', () => ({
  asyncHandler: (fn) => fn
}));

describe('get All Books method test', () => {
    let getAllBooks;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const bookModule = await import('../../controllers/booksController.js');
        getAllBooks = bookModule.getAllBooks;

        req = { query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return books with default query params', async () => {
        dbHelpers.fetchAll.mockResolvedValue([{
            id: 1,
            title: 'Test',
            isbn: '1234567890',
            published_year: 1996,
            author_id: 1,
            created_at: '2025-09-12 06:47:02',
            author: 'Test Author'
        }]);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply title filter when provided', async () => {
        req.query = { title: 'Test', year: '2025' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: 'Test',
                isbn: '1234567890',
                published_year: 2025,
                author_id: 1,
                author: 'Test Author'
            }
        ]);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE books.title LIKE ? AND books.published_year = ?'),
            expect.arrayContaining(['%Test%', '2025', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should return 204 when no books found', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getAllBooks(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any books in the list yet" });
    });
});
