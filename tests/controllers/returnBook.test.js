import { returnBook } from '../../controllers/borrowController.js';
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('returnBook unit tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

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
        const today = new Date().toISOString().split('T')[0];
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
        const today = new Date();
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
