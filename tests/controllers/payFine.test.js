import { payFine } from '../../controllers/fineController.js';
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('payFine unit tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: { fine_id: 1 },
            body: {}
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('should pay fine successfully when fine exists and is not paid', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 0,
                borrower_name: 'John Doe',
                book_id: 1,
                title: 'Test Book'
            })
            .mockResolvedValueOnce({
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 1,
                paid_date: expect.any(String),
                borrower_name: 'John Doe',
                book_id: 1,
                title: 'Test Book'
            });
        dbHelpers.execute.mockResolvedValue();

        await payFine(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE fines'),
            expect.arrayContaining([expect.any(String), 1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Fine paid successfully'
        }));
    });

    test('should throw 404 error when fine does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(payFine(req, res)).rejects.toMatchObject({
            message: 'Fine with id 1 does not exist',
            statusCode: 404,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should throw 400 error when fine is already paid', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({
            id: 1,
            borrow_record_id: 1,
            fine_amount: 2.5,
            fine_days: 5,
            is_paid: 1,
            paid_date: '2026-05-01',
            borrower_name: 'John Doe',
            book_id: 1,
            title: 'Test Book'
        });

        await expect(payFine(req, res)).rejects.toMatchObject({
            message: 'Fine is already paid',
            statusCode: 400,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

    test('should use provided paid_date when specified', async () => {
        req.body = { paid_date: '2026-05-04' };

        dbHelpers.fetchFirst
            .mockResolvedValueOnce({
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 0,
                borrower_name: 'John Doe',
                book_id: 1,
                title: 'Test Book'
            })
            .mockResolvedValueOnce({
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 1,
                paid_date: '2026-05-04',
                borrower_name: 'John Doe',
                book_id: 1,
                title: 'Test Book'
            });
        dbHelpers.execute.mockResolvedValue();

        await payFine(req, res);

        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE fines'),
            ['2026-05-04', 1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });
});
