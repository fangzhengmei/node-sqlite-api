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

describe('returnBook unit tests', () => {
    let returnBook;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const borrowModule = await import('../../controllers/borrowController.js');
        returnBook = borrowModule.returnBook;

        req = {
            params: { borrow_id: 1 },
            body: {}
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('should return book on time without fine', async () => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        dbHelpers.fetchFirst
            .mockResolvedValueOnce({
                id: 1,
                book_id: 1,
                title: 'Test Book',
                isbn: '1234567890',
                borrower_name: 'John Doe',
                borrow_date: '2026-04-20',
                due_date: dueDateStr,
                return_date: null
            });
        dbHelpers.execute.mockResolvedValue();

        await returnBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE borrow_records'),
            expect.arrayContaining([expect.any(String), 1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Book returned successfully',
            data: expect.objectContaining({
                overdue_days: 0,
                fine: null
            })
        }));
    });

    test('should return book overdue and create fine', async () => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() - 5);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        dbHelpers.fetchFirst
            .mockResolvedValueOnce({
                id: 1,
                book_id: 1,
                title: 'Test Book',
                isbn: '1234567890',
                borrower_name: 'John Doe',
                borrow_date: '2026-04-01',
                due_date: dueDateStr,
                return_date: null
            })
            .mockResolvedValueOnce({
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 0
            });
        dbHelpers.execute.mockResolvedValue();

        await returnBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledTimes(2);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                overdue_days: 5,
                fine: expect.objectContaining({
                    fine_amount: 2.5,
                    fine_days: 5
                })
            })
        }));
    });

    test('should throw 404 error when borrow record does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(returnBook(req, res)).rejects.toMatchObject({
            message: 'Borrow record with id 1 does not exist',
            statusCode: 404,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should throw 400 error when book already returned', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({
            id: 1,
            book_id: 1,
            title: 'Test Book',
            borrower_name: 'John Doe',
            borrow_date: '2026-04-20',
            due_date: '2026-05-04',
            return_date: '2026-05-02'
        });

        await expect(returnBook(req, res)).rejects.toMatchObject({
            message: 'Book already returned',
            statusCode: 400,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });
});
