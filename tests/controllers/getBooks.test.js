import { getAllBooks } from "../../controllers/booksController.js";
import * as dbHelpers from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

describe('get All Books method test', () => {
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

    const mockBooks = [
        {
            id: 1,
            title: 'Test',
            isbn: '1234567890',
            published_year: 1996,
            author_id: 1,
            created_at: '2025-09-12 06:47:02',
            author: 'Test'
        }
    ];

    const mockCategories = [
        { id: 1, name: 'Test Category' }
    ];

    test('should return books with default query params', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({ total: 1 });
        dbHelpers.fetchAll
            .mockResolvedValueOnce(mockBooks)
            .mockResolvedValue(mockCategories);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT COUNT'),
            expect.anything()
        );

        expect(dbHelpers.fetchAll).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array),
            pagination: expect.objectContaining({
                page: 1,
                limit: 10,
                total: 1
            })
        }));
    });

    test('should apply title filter when provided', async () => {
        req.query = { title: 'Test' };
        dbHelpers.fetchFirst.mockResolvedValue({ total: 1 });
        dbHelpers.fetchAll
            .mockResolvedValueOnce(mockBooks)
            .mockResolvedValue(mockCategories);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.title LIKE ?'),
            expect.arrayContaining(['%Test%'])
        );
    });

    test('should apply year filter when provided', async () => {
        req.query = { year: 2025 };
        dbHelpers.fetchFirst.mockResolvedValue({ total: 1 });
        dbHelpers.fetchAll
            .mockResolvedValueOnce(mockBooks)
            .mockResolvedValue(mockCategories);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.published_year = ?'),
            expect.arrayContaining(['2025'])
        );
    });

    test('should return 204 when no books found', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({ total: 0 });
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getAllBooks(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any books in the list yet" });
    });

    test('should apply category_id filter when provided', async () => {
        req.query = { category_id: 1 };
        dbHelpers.fetchFirst.mockResolvedValue({ total: 1 });
        dbHelpers.fetchAll
            .mockResolvedValueOnce(mockBooks)
            .mockResolvedValue(mockCategories);

        await getAllBooks(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('book_categories.category_id = ?'),
            expect.arrayContaining([1])
        );
    });
});
