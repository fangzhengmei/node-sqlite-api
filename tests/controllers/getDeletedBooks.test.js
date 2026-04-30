import { getDeletedBooks } from "../../controllers/booksController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('getDeletedBooks unit test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return deleted books with default query params', async () => {
        dbHelpers.fetchAll.mockResolvedValue([
            { id: 1, title: 'Test', isbn: '1234567890', published_year: 1996, author_id: 1, author: 'Test Author', deleted_at: '2025-09-13 06:47:02' }
        ]);

        await getDeletedBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE books.deleted_at IS NOT NULL'),
            expect.arrayContaining([10, 0])
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'deleted books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply title filter when provided', async () => {
        req.query = { title: 'Test' };
        dbHelpers.fetchAll.mockResolvedValue([
            { id: 1, title: 'Test Book', isbn: '1234567890', published_year: 1996, author_id: 1, author: 'Test Author', deleted_at: '2025-09-13 06:47:02' }
        ]);

        await getDeletedBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.title LIKE ?'),
            expect.arrayContaining(['%Test%', 10, 0])
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no deleted books found', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getDeletedBooks(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any deleted books in the list yet" });
    });
});
