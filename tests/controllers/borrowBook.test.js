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

describe('borrowBook unit tests', () => {
    let borrowBook;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const borrowModule = await import('../../controllers/borrowController.js');
        borrowBook = borrowModule.borrowBook;

        req = {
            body: {
                book_id: 1,
                borrower_name: 'John Doe',
                loan_days: 14
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('should borrow a book when book exists and is not borrowed', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890' })
            .mockResolvedValueOnce(null);
        dbHelpers.execute.mockResolvedValue();

        await borrowBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO borrow_records'),
            expect.arrayContaining([1, 'John Doe'])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Book borrowed successfully',
            data: expect.objectContaining({
                book_id: 1,
                borrower_name: 'John Doe'
            })
        }));
    });

    test('should throw 404 error when book does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'Book with id 1 does not exist',
            statusCode: 404,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 error when book is already borrowed', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890' })
            .mockResolvedValueOnce({ id: 1, book_id: 1, borrower_name: 'Jane Smith' });

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'Book with id 1 is already borrowed',
            statusCode: 409,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should use default loan days when not provided', async () => {
        req.body = { book_id: 1, borrower_name: 'John Doe' };

        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890' })
            .mockResolvedValueOnce(null);
        dbHelpers.execute.mockResolvedValue();

        await borrowBook(req, res);

        expect(dbHelpers.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
