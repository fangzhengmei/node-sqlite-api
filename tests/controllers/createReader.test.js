import { beforeEach, describe } from 'node:test';
import { createReader } from '../../controllers/readerController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Create Reader test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            body : { 
                name : '张三',
                email : 'zhangsan@example.com',
                phone : '13800138001',
                address : '北京市朝阳区'
            }
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should create a reader if it does not already exist', async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await createReader(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM readers WHERE email = ?',
            ['zhangsan@example.com']
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            `INSERT INTO readers(name, email, phone, address) VALUES (?,?,?,?)`,
            ['张三','zhangsan@example.com','13800138001','北京市朝阳区']
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Reader created successfully'});
    }),

    test('Throw 409 if reader already exists',async()=>{
        dbHelper.fetchFirst.mockResolvedValue({
                id : 1,
                name : '张三',
                email : 'zhangsan@example.com',
                phone : '13800138001',
                address : '北京市朝阳区',
                created_at : '2025-09-12 06:47:02',
            });
        
        await createReader(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

})
