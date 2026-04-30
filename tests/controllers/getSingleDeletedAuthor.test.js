import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let getSingleDeletedAuthor;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('getSingleDeletedAuthor unit test', () => {
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        
        mockFetchFirst = jest.fn();
        mockFetchAll = jest.fn();
        mockExecute = jest.fn();
        
        jest.doMock('../../utils/dbRunMethodWrapper.js', () => ({
            __esModule: true,
            fetchFirst: mockFetchFirst,
            fetchAll: mockFetchAll,
            execute: mockExecute
        }));
        
        const authorModule = await import('../../controllers/authorController.js');
        getSingleDeletedAuthor = authorModule.getSingleDeletedAuthor;

        req = { params: { authorId: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return a single deleted author with their deleted books', async () => {
        mockFetchAll.mockResolvedValue([
            {
                author_id: 1,
                name: 'Test Author',
                email: 'test@test.com',
                author_created_at: '2025-09-12 06:47:02',
                deleted_at: '2025-09-13 06:47:02',
                book_id: 1,
                title: 'Test Book',
                isbn: '1234567890',
                published_year: 2020,
                book_created_at: '2025-09-12 06:47:02'
            }
        ]);

        await getSingleDeletedAuthor(req, res);

        expect(mockFetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE authors.id = ? AND authors.deleted_at IS NOT NULL'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Deleted author retreived sucessfully',
            data: expect.objectContaining({
                id: 1,
                name: 'Test Author',
                email: 'test@test.com',
                deleted_at: '2025-09-13 06:47:02'
            })
        }));
    });

    test('should return 404 when deleted author does not exist', async () => {
        mockFetchAll.mockResolvedValue([]);

        await expect(getSingleDeletedAuthor(req, res)).rejects.toMatchObject({
            message: 'Deleted author with the given id 1 does not exist',
            statusCode: 404
        });
    });

    test('should return deleted author without books when no deleted books exist', async () => {
        mockFetchAll.mockResolvedValue([
            {
                author_id: 1,
                name: 'Test Author',
                email: 'test@test.com',
                author_created_at: '2025-09-12 06:47:02',
                deleted_at: '2025-09-13 06:47:02',
                book_id: null,
                title: null,
                isbn: null,
                published_year: null,
                book_created_at: null
            }
        ]);

        await getSingleDeletedAuthor(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                books: []
            })
        }));
    });
});
