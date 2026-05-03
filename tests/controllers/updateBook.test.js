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

describe('update books controller method test', () => {
    let updateBooks;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const bookModule = await import('../../controllers/booksController.js');
        updateBooks = bookModule.updateBooks;

        req = {
            body: {
                title: 'Test',
                isbn: '1234567890',
                published_year: 1996,
                author_id: 1
            },
            params: { id: 1 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('Book does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 400
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 if ISBN already exists', async () => {
        req = {
            body: { isbn: '1234567890' },
            params: { id: 1 }
        };

        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title' })
            .mockResolvedValueOnce({ id: 2, title: 'Another Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists, update it to something else',
            statusCode: 409
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should update multiple fields successfully', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title', isbn: '1234567999' })
            .mockResolvedValueOnce(null);
        dbHelpers.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET'),
            expect.arrayContaining(['Test', '1234567890', '1996', '1', 1])
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });
});
