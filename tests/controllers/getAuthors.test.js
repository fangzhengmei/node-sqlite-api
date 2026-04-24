import { getAllAuthors } from "../../controllers/authorController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

describe('get All authors unit test', () => {
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

    test('should return authors with default query params', async () => {
        dbHelpers.fetchAll.mockResolvedValue([{ id: 1, name: 'Test', email: 'test@gmail.com', cretatedAt: '2025-09-12 06:47:02', books_count: 5 }]);

        await getAllAuthors(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Authors retreived sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply name filter when provided', async () => {
        req.query = { name: 'Test' };
        dbHelpers.fetchAll.mockResolvedValue([{ id: 1, name: 'Test', email: 'test@gmail.com', cretatedAt: '2025-09-12 06:47:02', books_count: 5 }]);

        await getAllAuthors(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE authors.name LIKE ?'),
            expect.arrayContaining(['%Test%'])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no authors found', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getAllAuthors(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any authors in the list yet" });
    });
});
