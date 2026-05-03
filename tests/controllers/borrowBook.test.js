import { borrowBook } from '../../controllers/borrowController.js';
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('borrowBook unit tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

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
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
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
