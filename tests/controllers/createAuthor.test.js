import { createAuthor } from "../../controllers/authorController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js'

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('createAuthor unit tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: { name: 'Test', email: 'test@gmail.com' },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('should create a new author successfully', async () => {
        dbHelpers.execute.mockResolvedValue();

        await createAuthor(req, res);

        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            'INSERT INTO authors(name, email) VALUES (?,?)',
            ['Test', 'test@gmail.com']
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Author created successfully' });
    });
});
