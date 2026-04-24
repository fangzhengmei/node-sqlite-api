import { getBooksByCategory } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('getBooksByCategory test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { id: 1 },
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    const mockCategory = {
        id: 1,
        name: '文学小说',
        parent_id: null,
        is_active: 1
    };

    const mockBooks = [
        { id: 1, title: '哈利波特', isbn: '1234567890', published_year: 1997, author_id: 1, author: 'J.K. Rowling' },
        { id: 2, title: '冰与火之歌', isbn: '0987654321', published_year: 1996, author_id: 2, author: '乔治马丁' }
    ];

    test('should return books for category with default params', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 2 });
        dbHelper.fetchAll.mockResolvedValue(mockBooks);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM categories WHERE id = ?',
            [1]
        );

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE book_categories.category_id = ?'),
            expect.arrayContaining([1, 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Books retrieved successfully',
            category: mockCategory,
            data: mockBooks,
            pagination: expect.objectContaining({
                page: 1,
                limit: 10,
                total: 2
            })
        }));
    });

    test('should throw 404 if category not found', async () => {
        req.params = { id: 999 };

        dbHelper.fetchFirst.mockResolvedValueOnce(null);

        await expect(getBooksByCategory(req, res)).rejects.toThrow('No category with id 999 exists');
    });

    test('should return 204 when no books found for category', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 0 });
        dbHelper.fetchAll.mockResolvedValue([]);

        await getBooksByCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: 'No books found for this category' });
    });

    test('should apply title filter', async () => {
        req.query = { title: '哈利' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 1 });
        dbHelper.fetchAll.mockResolvedValue([mockBooks[0]]);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.title LIKE ?'),
            expect.arrayContaining(['%哈利%'])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should apply year filter', async () => {
        req.query = { year: 1997 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 1 });
        dbHelper.fetchAll.mockResolvedValue([mockBooks[0]]);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.published_year = ?'),
            expect.arrayContaining(['1997'])
        );
    });

    test('should apply multiple filters', async () => {
        req.query = { title: '哈利', year: 1997 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 1 });
        dbHelper.fetchAll.mockResolvedValue([mockBooks[0]]);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.title LIKE ? AND books.published_year = ?'),
            expect.arrayContaining(['%哈利%', '1997'])
        );
    });

    test('should handle pagination correctly', async () => {
        req.query = { page: 2, limit: 5 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 10 });
        dbHelper.fetchAll.mockResolvedValue(mockBooks);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([5, 5])
        );

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            pagination: expect.objectContaining({
                page: 2,
                limit: 5,
                total: 10,
                totalPages: 2
            })
        }));
    });

    test('should sort by title when specified', async () => {
        req.query = { sort: 'title', order: 'ASC' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 2 });
        dbHelper.fetchAll.mockResolvedValue(mockBooks);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('ORDER BY title ASC'),
            expect.anything()
        );
    });

    test('should sort by published_year when specified', async () => {
        req.query = { sort: 'published_year', order: 'DESC' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce(mockCategory)
            .mockResolvedValueOnce({ total: 2 });
        dbHelper.fetchAll.mockResolvedValue(mockBooks);

        await getBooksByCategory(req, res);

        expect(dbHelper.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('ORDER BY published_year DESC'),
            expect.anything()
        );
    });
});
