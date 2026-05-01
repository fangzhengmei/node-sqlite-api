import { createReader } from "../../controllers/readerController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js'

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('createReader unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {
            body : { name : 'Test Reader', email : 'reader@test.com', phone: '1234567890'},
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should create a new reader when email does not exist', async()=>{
        dbHelpers.fetchFirst.mockResolvedValue(null);
        dbHelpers.execute.mockResolvedValue();

        await createReader(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalled();
        expect(dbHelpers.execute).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Reader created successfully' });
    })

    test('throw error if the email already exists', async()=>{
        dbHelpers.fetchFirst.mockResolvedValue({ id : 1, name : 'Existing Reader', email : 'reader@test.com', phone: '0987654321', created_at : '2025-09-12 06:47:02' });

        await expect(createReader(req, res)).rejects.toMatchObject({
            message: 'Reader with this email already exists',
            statusCode: 409,
        });

        expect(dbHelpers.fetchFirst).toHaveBeenCalled();
        expect(dbHelpers.execute).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    })
})
