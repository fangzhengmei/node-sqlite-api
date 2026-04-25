import { jest } from '@jest/globals';

jest.mock('sqlite3', () => ({
  default: {
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      exec: jest.fn()
    }))
  }
}));

jest.mock('../../config/connDB.js', () => ({
  default: {}
}));

jest.mock('../../logger/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../utils/dbRunMethodWrapper.js', () => ({
  execute: jest.fn(),
  fetchFirst: jest.fn(),
  fetchAll: jest.fn()
}));

describe('get All Books method test', () => {
    let req;
    let res;
    let getAllBooks;
    let dbHelpers;

    beforeEach(async () => {
        jest.clearAllMocks();
        
        const booksController = await import('../../controllers/booksController.js');
        getAllBooks = booksController.getAllBooks;
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
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

    test('should apply title and year filters together with case-insensitive title', async () => {
        req.query = { title: 'Test', year: '2025' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: 'Test Book',
                isbn: '1234567890',
                published_year: 2025,
                author_id: 1,
                author: 'Test Author'
            }
        ]);

        await getAllBooks(req, res);

        const expectedSql = expect.stringMatching(/LOWER\(books\.title\) LIKE LOWER\(\?\).*books\.published_year = \?/s);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expectedSql,
            expect.arrayContaining(['%Test%', '2025', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply title and author filters together with case-insensitive matching', async () => {
        req.query = { title: 'Harry', author: 'Rowling' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: "Harry Potter and the Philosopher's Stone",
                isbn: '9780747532743',
                published_year: 1997,
                author_id: 1,
                author: 'J.K. Rowling'
            }
        ]);

        await getAllBooks(req, res);

        const expectedSql = expect.stringMatching(/LOWER\(books\.title\) LIKE LOWER\(\?\).*LOWER\(authors\.name\) LIKE LOWER\(\?\)/s);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expectedSql,
            expect.arrayContaining(['%Harry%', '%Rowling%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should handle case-insensitive title search with mixed case input', async () => {
        req.query = { title: 'hArRy' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: 'Harry Potter',
                isbn: '1234567890',
                published_year: 1997,
                author_id: 1,
                author: 'J.K. Rowling'
            }
        ]);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LOWER(books.title) LIKE LOWER(?)'),
            expect.arrayContaining(['%hArRy%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle case-insensitive author search with mixed case input', async () => {
        req.query = { author: 'rOwLiNg' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: 'Harry Potter',
                isbn: '1234567890',
                published_year: 1997,
                author_id: 1,
                author: 'J.K. Rowling'
            }
        ]);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LOWER(authors.name) LIKE LOWER(?)'),
            expect.arrayContaining(['%rOwLiNg%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should apply all three filters: title, author, and year together', async () => {
        req.query = { title: 'Potter', author: 'Rowling', year: '1997' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                title: "Harry Potter and the Philosopher's Stone",
                isbn: '9780747532743',
                published_year: 1997,
                author_id: 1,
                author: 'J.K. Rowling'
            }
        ]);

        await getAllBooks(req, res);

        const expectedSql = expect.stringMatching(
            /LOWER\(books\.title\) LIKE LOWER\(\?\).*books\.published_year = \?.*LOWER\(authors\.name\) LIKE LOWER\(\?\)/s
        );

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expectedSql,
            expect.arrayContaining(['%Potter%', '1997', '%Rowling%', 10, 0])
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
