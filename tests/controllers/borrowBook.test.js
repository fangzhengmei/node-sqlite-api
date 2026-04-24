import { beforeEach, describe } from 'node:test';
import { borrowBook } from '../../controllers/borrowController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Borrow Book test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            body : { 
                reader_id : 1,
                book_id : 1,
                due_date : '2025-10-15T00:00:00Z'
            }
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should borrow a book successfully', async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Harry Potter', isbn: '1234567890' })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ count: 0 });
        
        dbHelper.execute.mockResolvedValue();

        await borrowBook(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM readers WHERE id = ?',
            [1]
        );

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM books WHERE id = ?',
            [1]
        );

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE book_id = ? AND status = \'borrowed\''),
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            `INSERT INTO borrow_records(reader_id, book_id, due_date, status) VALUES (?,?,?,?)`,
            [1, 1, '2025-10-15T00:00:00Z', 'borrowed']
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Book borrowed successfully'});
    }),

    test('Throw 400 if reader does not exist',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);
        
        await borrowBook(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    test('Throw 400 if book does not exist',async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce(null);
        
        await borrowBook(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Throw 400 if book is already borrowed',async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Harry Potter', isbn: '1234567890' })
            .mockResolvedValueOnce({ id: 1, reader_id: 2, book_id: 1, status: 'borrowed' });
        
        await borrowBook(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Throw 400 if reader has reached max borrow limit',async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Harry Potter', isbn: '1234567890' })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ count: 5 });
        
        await borrowBook(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

})
