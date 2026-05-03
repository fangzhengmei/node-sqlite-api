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

describe('Create Books test', () => {
    let createBooks;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const bookModule = await import('../../controllers/booksController.js');
        createBooks = bookModule.createBooks;

        req = {
            body: {
                title: 'Test',
                isbn: '1234567890',
                published_year: 1996,
                author_id: 1
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should create a book if it does not already exist and author exists', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelpers.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            expect.arrayContaining(['Test', '1234567890', 1996, 1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book created successfully' });
    });

    test('Throw 409 if book already exists', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({
            id: 1,
            title: 'Test',
            isbn: '1234567890',
            published_year: 1996,
            author_id: 1,
            created_at: '2025-09-12 06:47:02',
        });

        await expect(createBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists',
            statusCode: 409
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });
});
