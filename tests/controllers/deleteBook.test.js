import { deleteBook } from "../../controllers/booksController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('deleteBook unit test', () => {
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

    test('should soft delete an existing book', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book', isbn: '1234567890' });
        dbHelpers.execute.mockResolvedValue();

        await deleteBook(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE id = ? AND deleted_at IS NULL'),
            [1]
        );
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = CURRENT_TIMESTAMP'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book deleted successfully' });
    });

    test('should return 404 when book does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await deleteBook(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'Book with the given id 1 does not exist' })
        );
    });

    test('should return 404 when book is already deleted', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await deleteBook(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
