import { beforeEach, describe } from 'node:test';
import { updateOverdueStatuses } from '../../controllers/borrowController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Update Overdue Statuses test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = {};
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should update overdue statuses successfully', async()=>{
        dbHelper.execute.mockResolvedValue();

        await updateOverdueStatuses(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE borrow_records'),
            expect.any(Array)
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Overdue statuses updated successfully'});
    });
})
