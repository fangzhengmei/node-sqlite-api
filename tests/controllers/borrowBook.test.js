import { borrowBook, returnBook } from "../../controllers/borrowController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js'

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('borrowBook unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {
            body : { reader_id : 1, book_id : 1, borrow_days: 14 },
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should borrow a book when available and no existing borrow', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ available_quantity: 5 });
        
        dbHelpers.execute.mockResolvedValue();

        await borrowBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(5);
        expect(dbHelpers.execute).toHaveBeenCalledTimes(2);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book borrowed successfully' });
    })

    test('throw error if reader does not exist', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce(null);

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'Reader with id 1 does not exist',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if book does not exist', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce(null);

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'Book with id 1 does not exist',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if reader already has the book borrowed', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'borrowed' });

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'You already have this book borrowed',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if no available copies and no reservation', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ available_quantity: 0 });

        await expect(borrowBook(req, res)).rejects.toMatchObject({
            message: 'This book has no available copies. You can make a reservation.',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })
})

describe('returnBook unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {
            params : { id : 1 },
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should return a book successfully', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'borrowed' });
        
        dbHelpers.execute.mockResolvedValue();

        await returnBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book returned successfully' });
    })

    test('throw error if borrow record does not exist', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce(null);

        await expect(returnBook(req, res)).rejects.toMatchObject({
            message: 'Borrow record with id 1 does not exist',
            statusCode: 404,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if book already returned', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'returned' });

        await expect(returnBook(req, res)).rejects.toMatchObject({
            message: 'This book has already been returned',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })
})
