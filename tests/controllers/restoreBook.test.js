import { restoreBook } from "../../controllers/booksController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('restoreBook unit test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { params: { id: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should restore a deleted book when author is not deleted', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', author_id: 1, deleted_at: '2025-09-13 06:47:02' })
            .mockResolvedValueOnce({ id: 1, name: 'Test Author', email: 'test@test.com' });
        dbHelpers.execute.mockResolvedValue();

        await restoreBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.fetchFirst).toHaveBeenNthCalledWith(1,
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE id = ? AND deleted_at IS NOT NULL'),
            [1]
        );
        expect(dbHelpers.fetchFirst).toHaveBeenNthCalledWith(2,
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE id = ? AND deleted_at IS NULL'),
            [1]
        );
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = NULL'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book restored successfully' });
    });

    test('should return 404 when deleted book does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await restoreBook(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'Deleted book with the given id 1 does not exist' })
        );
    });

    test('should return 400 when author is also deleted', async () => {
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', author_id: 1, deleted_at: '2025-09-13 06:47:02' })
            .mockResolvedValueOnce(null);

        await restoreBook(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'Cannot restore book because its author is also deleted. Please restore the author first.' })
        );
    });
});
