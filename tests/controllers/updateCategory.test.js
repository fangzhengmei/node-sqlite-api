import { updateCategory } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('updateCategory test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { id: 1 },
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should update category name successfully', async () => {
        req.body = { name: '更新后的分类名' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '原分类名', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM categories WHERE id = ?',
            [1]
        );

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM categories WHERE name = ? AND id != ?',
            ['更新后的分类名', 1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE categories SET'),
            expect.arrayContaining(['更新后的分类名', 1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Category updated successfully' });
    });

    test('should throw 400 if no fields provided', async () => {
        req.body = {};

        dbHelper.fetchFirst.mockResolvedValue({ id: 1, name: '原分类名', parent_id: null, is_active: 1 });

        await expect(updateCategory(req, res)).rejects.toThrow('At least one field must be provided to update');
    });

    test('should throw 404 if category not found', async () => {
        req.body = { name: '更新后的分类名' };
        req.params = { id: 999 };

        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(updateCategory(req, res)).rejects.toThrow('No such category with id 999 exists');
    });

    test('should throw 409 if new name already exists', async () => {
        req.body = { name: '已存在的分类名' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '原分类名', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ id: 2, name: '已存在的分类名', parent_id: null, is_active: 1 });

        await expect(updateCategory(req, res)).rejects.toThrow('Category with this name already exists');
    });

    test('should update parent_id successfully', async () => {
        req.body = { parent_id: 2 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '原分类名', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce({ id: 2, name: '新父分类', parent_id: null, is_active: 1 });
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('parent_id = ?'),
            expect.arrayContaining([2])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should remove parent_id when set to null', async () => {
        req.body = { parent_id: null };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '原分类名', parent_id: 2, is_active: 1 });
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('parent_id = ?'),
            expect.arrayContaining([null])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw 400 if trying to set self as parent', async () => {
        req.params = { id: 1 };
        req.body = { parent_id: 1 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '分类名', parent_id: null, is_active: 1 });

        await expect(updateCategory(req, res)).rejects.toThrow('A category cannot be its own parent');
    });

    test('should throw 400 if parent_id does not exist', async () => {
        req.body = { parent_id: 999 };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '分类名', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce(null);

        await expect(updateCategory(req, res)).rejects.toThrow('No such parent category with id 999 exists');
    });

    test('should update is_active status', async () => {
        req.body = { is_active: false };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '分类名', parent_id: null, is_active: 1 });
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('is_active = ?'),
            expect.arrayContaining([0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should update multiple fields at once', async () => {
        req.body = {
            name: '新名称',
            description: '新描述',
            is_active: false
        };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '原分类名', parent_id: null, is_active: 1 })
            .mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE categories SET'),
            expect.arrayContaining(['新名称', '新描述', 0, 1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should not check duplicate when name is not changed', async () => {
        req.body = { description: '新描述' };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: '分类名', parent_id: null, is_active: 1 });
        dbHelper.execute.mockResolvedValue();

        await updateCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
