import { getDeletedAuthors } from "../../controllers/authorController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('getDeletedAuthors unit test', () => {
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

    test('should return deleted authors with default query params', async () => {
        dbHelpers.fetchAll.mockResolvedValue([
            { id: 1, name: 'Test', email: 'test@gmail.com', deleted_at: '2025-09-12 06:47:02', books_count: 5 }
        ]);

        await getDeletedAuthors(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE authors.deleted_at IS NOT NULL'),
            expect.arrayContaining([10, 0])
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Deleted authors retreived sucessfully',
            data: expect.any(Array),
            pagination: { page: 1, limit: 10, count: 1 }
        }));
    });

    test('should apply name filter when provided', async () => {
        req.query = { name: 'Test' };
        dbHelpers.fetchAll.mockResolvedValue([
            { id: 1, name: 'Test', email: 'test@gmail.com', deleted_at: '2025-09-12 06:47:02', books_count: 5 }
        ]);

        await getDeletedAuthors(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('AND authors.name LIKE ?'),
            expect.arrayContaining(['%Test%', 10, 0])
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no deleted authors found', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getDeletedAuthors(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any deleted authors in the list yet" });
    });
});
