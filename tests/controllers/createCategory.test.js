import { createCategory } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

describe('createCategory test', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {
                name: '测试分类',
                description: '这是一个测试分类',
                is_active: true
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should create a root category successfully', async () => {
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await createCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM categories WHERE name = ?',
            ['测试分类']
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO categories'),
            ['测试分类', '这是一个测试分类', null, 1]
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Category created successfully' });
    });

    test('should create a category with parent_id', async () => {
        req.body.parent_id = 1;
        
        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, name: '父分类', parent_id: null });
        dbHelper.execute.mockResolvedValue();

        await createCategory(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenNthCalledWith(1,
            expect.anything(),
            'SELECT * FROM categories WHERE name = ?',
            ['测试分类']
        );

        expect(dbHelper.fetchFirst).toHaveBeenNthCalledWith(2,
            expect.anything(),
            'SELECT * FROM categories WHERE id = ?',
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO categories'),
            ['测试分类', '这是一个测试分类', 1, 1]
        );

        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should throw 409 if category name already exists', async () => {
        dbHelper.fetchFirst.mockResolvedValue({
            id: 1,
            name: '测试分类',
            parent_id: null,
            is_active: 1
        });

        await expect(createCategory(req, res)).rejects.toThrow('Category with this name already exists');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 400 if parent_id does not exist', async () => {
        req.body.parent_id = 999;

        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        await expect(createCategory(req, res)).rejects.toThrow('No such parent category with id 999 exists');
    });

    test('should set is_active to false when specified', async () => {
        req.body.is_active = false;
        
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await createCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO categories'),
            ['测试分类', '这是一个测试分类', null, 0]
        );

        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should handle null description correctly', async () => {
        delete req.body.description;
        
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await createCategory(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO categories'),
            ['测试分类', null, null, 1]
        );
    });
});
