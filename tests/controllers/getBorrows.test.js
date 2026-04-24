import { beforeEach } from "node:test";
import { getAllBorrowRecords } from "../../controllers/borrowController.js"
import * as dbHelpers from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('get All Borrow Records method test', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { query : {}},
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('should return borrow records with default query params', async()=>{
        dbHelpers.fetchAll.mockResolvedValue([{
                    id : 1,
                    reader_id : 1,
                    reader_name : '张三',
                    reader_email : 'zhangsan@example.com',
                    book_id : 1,
                    book_title : 'Harry Potter',
                    book_isbn : '1234567890',
                    borrow_date : '2025-09-12T06:47:02Z',
                    due_date : '2025-10-12T06:47:02Z',
                    return_date : null,
                    status : 'borrowed',
                    created_at : '2025-09-12 06:47:02'
                }]);
        
        await getAllBorrowRecords(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10,0])
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Borrow records retreived sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply reader_id filter when provided', async()=>{
        req.query = { reader_id : 1 };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id:1,
                reader_id:1,
                reader_name:'张三',
                book_title:'Harry Potter',
                status:'borrowed'
            }
        ]);

        await getAllBorrowRecords(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE borrow_records.reader_id = ?'),
            expect.arrayContaining([1, 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Borrow records retreived sucessfully',
            data: expect.any(Array),
            pagination: { page: 1, limit: 10, count: 1 }
        }));
    });

    test('should apply status filter when provided', async()=>{
        req.query = { status : 'borrowed' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id:1,
                reader_name:'张三',
                book_title:'Harry Potter',
                status:'borrowed'
            }
        ]);

        await getAllBorrowRecords(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE borrow_records.status = ?'),
            expect.arrayContaining(['borrowed', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no borrow records found', async()=>{
            dbHelpers.fetchAll.mockResolvedValue([]);
    
            await getAllBorrowRecords(req,res);
    
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({msg:"No any borrow records in the list yet"});
    });
})
