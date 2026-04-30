import { deleteAuthor } from "../../controllers/authorController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('deleteAuthor unit test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { params: { authorId: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should soft delete an existing author and their books', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({ id: 1, name: 'Test Author', email: 'test@test.com' });
        dbHelpers.execute.mockResolvedValue();

        await deleteAuthor(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE id = ? AND deleted_at IS NULL'),
            [1]
        );
        expect(dbHelpers.execute).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = CURRENT_TIMESTAMP'),
            [1]
        );
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE authors SET deleted_at = CURRENT_TIMESTAMP'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Author deleted successfully' });
    });

    test('should return 404 when author does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(deleteAuthor(req, res)).rejects.toMatchObject({
            message: 'Author with the given id 1 does not exist',
            statusCode: 404
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });
});
