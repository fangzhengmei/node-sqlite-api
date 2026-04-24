import { deleteCategory } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

describe('deleteCategory test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { id: 1 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should delete category successfully when no children', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '测试分类', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ count: 0 })
            .mockResolvedValueOnce({ count: 0 });
        dbHelper.execute.mockResolvedValue();

        await deleteCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenNthCalledWith(1,
            expect.anything(),
            expect.stringContaining('SELECT * FROM categories WHERE id = ?'),
            [1]
        );

        expect(dbHelper.fetchFirst).toHaveBeenNthCalledWith(2,
            expect.anything(),
            expect.stringContaining('COUNT(*) as count FROM categories WHERE parent_id'),
            [1]
        );

        expect(dbHelper.fetchFirst).toHaveBeenNthCalledWith(3,
            expect.anything(),
            expect.stringContaining('COUNT(*) as count FROM book_categories WHERE category_id'),
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('DELETE FROM categories WHERE id = ?'),
            [1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Category deleted successfully',
            deleted_books_count: 0
        }));
    });

    test('should throw 404 if category not found', async () => {
        req.params = { id: 999 };
        
        dbHelper.fetchFirst.mockResolvedValueOnce(null);

        await expect(deleteCategory(req, res)).rejects.toThrow('No such category with id 999 exists');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 400 if category has children', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '父分类', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ count: 3 });

        await expect(deleteCategory(req, res)).rejects.toThrow(
            'Cannot delete category with 3 children. Please delete or reassign them first.'
        );

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should return deleted_books_count when category has associated books', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '分类', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ count: 0 })
            .mockResolvedValueOnce({ count: 5 });
        dbHelper.execute.mockResolvedValue();

        await deleteCategory(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Category deleted successfully',
            deleted_books_count: 5
        }));
    });

    test('should delete leaf category with books', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '子分类', parent_id: 2, is_active: 1 })
            .mockResolvedValueOnce({ count: 0 })
            .mockResolvedValueOnce({ count: 10 });
        dbHelper.execute.mockResolvedValue();

        await deleteCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('DELETE FROM categories WHERE id = ?'),
            [1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            deleted_books_count: 10
        }));
    });

    test('should not delete when category has one child', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '父分类', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ count: 1 });

        await expect(deleteCategory(req, res)).rejects.toThrow(
            'Cannot delete category with 1 children. Please delete or reassign them first.'
        );
    });
});
