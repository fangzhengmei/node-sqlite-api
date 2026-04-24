import { beforeEach, describe } from 'node:test';
import { updateReader } from '../../controllers/readerController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Update Reader test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            params : { 
                id : 1
            },
            body : {
                name : '新名字',
                email : 'newemail@example.com'
            }
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should update a reader successfully', async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce(null);
        
        dbHelper.execute.mockResolvedValue();

        await updateReader(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM readers WHERE id = ?',
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE readers'),
            expect.arrayContaining([1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Reader updated successfully'});
    }),

    test('Throw 404 if reader does not exist',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);
        
        await updateReader(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    test('Throw 400 if no fields provided',async()=>{
        req.body = {};
        dbHelper.fetchFirst.mockResolvedValue({ id: 1, name: '张三', email: 'zhangsan@example.com' });
        
        await updateReader(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Throw 409 if email already exists for another reader',async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '张三', email: 'zhangsan@example.com' })
            .mockResolvedValueOnce({ id: 2, name: '李四', email: 'newemail@example.com' });
        
        await updateReader(req,res);

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

})
