import { setBookCategories, getBookCategories } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Book Categories Association Tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { bookId: 1 },
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    const mockBook = {
        id: 1,
        title: '哈利波特',
        isbn: '1234567890',
        published_year: 1997,
        author_id: 1
    };

    describe('getBookCategories', () => {
        const mockCategories = [
            { id: 1, name: '文学小说', parent_id: null, is_active: 1 },
            { id: 2, name: '科幻小说', parent_id: 1, is_active: 1 }
        ];

        test('should return categories for a book', async () => {
            dbHelper.fetchFirst.mockResolvedValueOnce(mockBook);
            dbHelper.fetchAll.mockResolvedValueOnce(mockCategories);

            await getBookCategories(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                'SELECT * FROM books WHERE id = ?',
                [1]
            );

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('JOIN book_categories bc ON c.id = bc.category_id'),
                [1]
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Book categories retrieved successfully',
                data: mockCategories
            }));
        });

        test('should throw 404 if book not found', async () => {
            req.params = { bookId: 999 };
            
            dbHelper.fetchFirst.mockResolvedValueOnce(null);

            await expect(getBookCategories(req, res)).rejects.toThrow('No book with id 999 exists');
        });

        test('should return empty array when book has no categories', async () => {
            dbHelper.fetchFirst.mockResolvedValueOnce(mockBook);
            dbHelper.fetchAll.mockResolvedValueOnce([]);

            await getBookCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: []
            }));
        });
    });

    describe('setBookCategories', () => {
        const mockCategory1 = { id: 1, name: '文学小说', parent_id: null, is_active: 1 };
        const mockCategory2 = { id: 2, name: '科幻小说', parent_id: 1, is_active: 1 };

        test('should set categories for a book', async () => {
            req.body = { category_ids: [1, 2] };

            dbHelper.fetchFirst
                .mockResolvedValueOnce(mockBook)
                .mockResolvedValueOnce(mockCategory1)
                .mockResolvedValueOnce(mockCategory2);
            dbHelper.execute.mockResolvedValue();

            await setBookCategories(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                'SELECT * FROM books WHERE id = ?',
                [1]
            );

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                'SELECT * FROM categories WHERE id = ?',
                [1]
            );

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                'SELECT * FROM categories WHERE id = ?',
                [2]
            );

            expect(dbHelper.execute).toHaveBeenNthCalledWith(1,
                expect.anything(),
                'DELETE FROM book_categories WHERE book_id = ?',
                [1]
            );

            expect(dbHelper.execute).toHaveBeenNthCalledWith(2,
                expect.anything(),
                expect.stringContaining('INSERT OR IGNORE INTO book_categories'),
                expect.arrayContaining([1, 1, 1, 2])
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ msg: 'Book categories updated successfully' });
        });

        test('should throw 404 if book not found', async () => {
            req.params = { bookId: 999 };
            req.body = { category_ids: [1] };

            dbHelper.fetchFirst.mockResolvedValueOnce(null);

            await expect(setBookCategories(req, res)).rejects.toThrow('No book with id 999 exists');
        });

        test('should throw 404 if any category not found', async () => {
            req.body = { category_ids: [1, 999] };

            dbHelper.fetchFirst
                .mockResolvedValueOnce(mockBook)
                .mockResolvedValueOnce(mockCategory1)
                .mockResolvedValueOnce(null);

            await expect(setBookCategories(req, res)).rejects.toThrow('No category with id 999 exists');
        });

        test('should remove all categories when category_ids is empty array', async () => {
            req.body = { category_ids: [] };

            dbHelper.fetchFirst.mockResolvedValueOnce(mockBook);
            dbHelper.execute.mockResolvedValue();

            await setBookCategories(req, res);

            expect(dbHelper.execute).toHaveBeenCalledWith(
                expect.anything(),
                'DELETE FROM book_categories WHERE book_id = ?',
                [1]
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should set single category', async () => {
            req.body = { category_ids: [1] };

            dbHelper.fetchFirst
                .mockResolvedValueOnce(mockBook)
                .mockResolvedValueOnce(mockCategory1);
            dbHelper.execute.mockResolvedValue();

            await setBookCategories(req, res);

            expect(dbHelper.execute).toHaveBeenNthCalledWith(2,
                expect.anything(),
                expect.stringContaining('INSERT OR IGNORE INTO book_categories'),
                expect.arrayContaining([1, 1])
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should replace existing categories with new ones', async () => {
            req.body = { category_ids: [3] };
            const mockCategory3 = { id: 3, name: '悬疑推理', parent_id: 1, is_active: 1 };

            dbHelper.fetchFirst
                .mockResolvedValueOnce(mockBook)
                .mockResolvedValueOnce(mockCategory3);
            dbHelper.execute.mockResolvedValue();

            await setBookCategories(req, res);

            expect(dbHelper.execute).toHaveBeenNthCalledWith(1,
                expect.anything(),
                'DELETE FROM book_categories WHERE book_id = ?',
                [1]
            );

            expect(dbHelper.execute).toHaveBeenNthCalledWith(2,
                expect.anything(),
                expect.stringContaining('INSERT OR IGNORE INTO book_categories'),
                expect.arrayContaining([1, 3])
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
