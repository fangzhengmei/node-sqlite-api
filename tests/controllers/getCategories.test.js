import { getAllCategories, getSingleCategory, getCategoryTree } from '../../controllers/categoryController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Categories Query Tests', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { query: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getAllCategories', () => {
        const mockCategories = [
            { id: 1, name: '文学小说', parent_id: null, is_active: 1, children_count: 2, books_count: 5 },
            { id: 2, name: '科幻小说', parent_id: 1, is_active: 1, children_count: 0, books_count: 3 }
        ];

        test('should return categories with default query params', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ total: 2 });
            dbHelper.fetchAll.mockResolvedValue(mockCategories);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('LIMIT ? OFFSET ?'),
                expect.arrayContaining([100, 0])
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Categories retrieved successfully',
                data: expect.any(Array),
                pagination: expect.objectContaining({
                    page: 1,
                    limit: 100,
                    total: 2
                })
            }));
        });

        test('should apply name filter when provided', async () => {
            req.query = { name: '小说' };
            
            dbHelper.fetchFirst.mockResolvedValue({ total: 1 });
            dbHelper.fetchAll.mockResolvedValue([mockCategories[0]]);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('WHERE c.name LIKE ?'),
                expect.arrayContaining(['%小说%'])
            );
        });

        test('should filter by parent_id when provided', async () => {
            req.query = { parent_id: 1 };
            
            dbHelper.fetchFirst.mockResolvedValue({ total: 1 });
            dbHelper.fetchAll.mockResolvedValue([mockCategories[1]]);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('c.parent_id = ?'),
                expect.arrayContaining([1])
            );
        });

        test('should filter root categories when parent_id is "null"', async () => {
            req.query = { parent_id: 'null' };
            
            dbHelper.fetchFirst.mockResolvedValue({ total: 1 });
            dbHelper.fetchAll.mockResolvedValue([mockCategories[0]]);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('c.parent_id IS NULL'),
                expect.anything()
            );
        });

        test('should filter by is_active status', async () => {
            req.query = { is_active: true };
            
            dbHelper.fetchFirst.mockResolvedValue({ total: 2 });
            dbHelper.fetchAll.mockResolvedValue(mockCategories);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('c.is_active = ?'),
                expect.arrayContaining([1])
            );
        });

        test('should return 204 when no categories found', async () => {
            dbHelper.fetchFirst.mockResolvedValue({ total: 0 });
            dbHelper.fetchAll.mockResolvedValue([]);

            await getAllCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({ msg: 'No categories found' });
        });

        test('should handle pagination correctly', async () => {
            req.query = { page: 2, limit: 5 };
            
            dbHelper.fetchFirst.mockResolvedValue({ total: 10 });
            dbHelper.fetchAll.mockResolvedValue(mockCategories);

            await getAllCategories(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('LIMIT ? OFFSET ?'),
                expect.arrayContaining([5, 5])
            );
        });
    });

    describe('getSingleCategory', () => {
        const mockCategory = {
            id: 1,
            name: '文学小说',
            description: '各类小说',
            parent_id: null,
            is_active: 1,
            children_count: 2,
            books_count: 5,
            parent_name: null
        };

        const mockChildren = [
            { id: 2, name: '科幻小说', parent_id: 1, is_active: 1 }
        ];

        test('should return single category with children', async () => {
            req.params = { id: 1 };
            
            dbHelper.fetchFirst.mockResolvedValue(mockCategory);
            dbHelper.fetchAll.mockResolvedValue(mockChildren);

            await getSingleCategory(req, res);

            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('WHERE c.id = ?'),
                [1]
            );

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('WHERE parent_id = ?'),
                [1]
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Category retrieved successfully',
                data: expect.objectContaining({
                    id: 1,
                    name: '文学小说',
                    children: mockChildren
                })
            }));
        });

        test('should throw 404 if category not found', async () => {
            req.params = { id: 999 };
            
            dbHelper.fetchFirst.mockResolvedValue(null);

            await expect(getSingleCategory(req, res)).rejects.toThrow('No category with id 999 exists');
        });
    });

    describe('getCategoryTree', () => {
        const mockFlatCategories = [
            { id: 1, name: '文学小说', parent_id: null, is_active: 1, books_count: 5 },
            { id: 2, name: '科幻小说', parent_id: 1, is_active: 1, books_count: 3 },
            { id: 3, name: '悬疑推理', parent_id: 1, is_active: 1, books_count: 2 },
            { id: 4, name: '技术书籍', parent_id: null, is_active: 1, books_count: 4 }
        ];

        test('should return category tree structure', async () => {
            dbHelper.fetchAll.mockResolvedValue(mockFlatCategories);

            await getCategoryTree(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('FROM categories c'),
                []
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Category tree retrieved successfully',
                data: expect.any(Array)
            }));
        });

        test('should build nested tree structure correctly', async () => {
            dbHelper.fetchAll.mockResolvedValue(mockFlatCategories);

            await getCategoryTree(req, res);

            const result = res.json.mock.calls[0][0];
            const tree = result.data;

            expect(tree.length).toBe(2);
            expect(tree[0].children.length).toBe(2);
            expect(tree[0].children[0].name).toBe('科幻小说');
        });

        test('should filter by is_active when provided', async () => {
            req.query = { is_active: 'true' };
            
            dbHelper.fetchAll.mockResolvedValue(mockFlatCategories);

            await getCategoryTree(req, res);

            expect(dbHelper.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('WHERE c.is_active = ?'),
                [1]
            );
        });
    });
});
