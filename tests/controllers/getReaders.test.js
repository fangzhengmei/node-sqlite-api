import { beforeEach } from "node:test";
import { getAllReaders } from "../../controllers/readerController.js"
import * as dbHelpers from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('get All Readers method test', ()=>{
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

    test('should return readers with default query params', async()=>{
        dbHelpers.fetchAll.mockResolvedValue([{
                    id : 1,
                    name : '张三',
                    email : 'zhangsan@example.com',
                    phone : '13800138001',
                    address : '北京市朝阳区',
                    created_at : '2025-09-12 06:47:02',
                    borrow_count: 2
                }]);
        
        await getAllReaders(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10,0])
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Readers retreived sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply name filter when provided', async()=>{
        req.query = { name : '张三' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id:1,
                name:'张三',
                email:'zhangsan@example.com', 
                created_at:'2025-09-12 06:47:02', 
                borrow_count: 2
            }
        ]);

        await getAllReaders(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE readers.name LIKE ?'),
            expect.arrayContaining(['%张三%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Readers retreived sucessfully',
            data: expect.any(Array),
            pagination: { page: 1, limit: 10, count: 1 }
        }));
    });

    test('should return 204 when no readers found', async()=>{
            dbHelpers.fetchAll.mockResolvedValue([]);
    
            await getAllReaders(req,res);
    
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({msg:"No any readers in the list yet"});
    });
})
