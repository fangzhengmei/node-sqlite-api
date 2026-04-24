import { beforeEach, describe } from 'node:test';
import { returnBook } from '../../controllers/borrowController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

dbHelper.runWithTransaction.mockImplementation(async (db, callback) => {
    return await callback();
});

describe('Return Book test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            params : { 
                id : 1
            }
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should return a book successfully (on time)', async()=>{
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        dbHelper.fetchFirst.mockResolvedValue({ 
            id: 1, 
            reader_id: 1, 
            book_id: 1, 
            due_date: futureDate,
            status: 'borrowed' 
        });
        
        dbHelper.execute.mockResolvedValue();

        await returnBook(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM borrow_records WHERE id = ?',
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE borrow_records'),
            expect.arrayContaining([1])
        );
    }),

    test('Throw 404 if borrow record does not exist',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);
        
        await expect(returnBook(req,res)).rejects.toThrow('No such borrow record with id 1 exists');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Throw 400 if book is already returned',async()=>{
        dbHelper.fetchFirst.mockResolvedValue({ 
            id: 1, 
            reader_id: 1, 
            book_id: 1, 
            due_date: '2025-10-12T06:47:02Z',
            status: 'returned' 
        });
        
        await expect(returnBook(req,res)).rejects.toThrow('This book has already been returned');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

})
