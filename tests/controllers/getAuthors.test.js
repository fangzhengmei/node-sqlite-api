import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let getAllAuthors;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('get All authors unit test', async ()=>{
    let req;
    let res;

    beforeEach(async ()=>{
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
        getAllAuthors = authorModule.getAllAuthors;

        req = { query : {}};
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('should return authors with default query params', async()=>{
        mockFetchAll.mockResolvedValue([{id:1, name:'Test', email:'test@gmail.com', cretatedAt:'2025-09-12 06:47:02', books_count: 5}]);

        await getAllAuthors(req,res);

        expect(mockFetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10,0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Authors retreived sucessfully',
            data: expect.any(Array),
            pagination: { page: 1, limit: 10, count: 1 }
        }));
    });

    test('should apply name filter when provided', async()=>{
        req.query = { name : 'Test'};
        mockFetchAll.mockResolvedValue([{id:1, name:'Test', email:'test@gmail.com', cretatedAt:'2025-09-12 06:47:02', books_count: 5}]);

        await getAllAuthors(req,res);

        expect(mockFetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('authors.name LIKE ?'),
            expect.arrayContaining(['%Test%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Authors retreived sucessfully',
            data: expect.any(Array),
            pagination: { page: 1, limit: 10, count: 1 }
        }));
    });

    test('should return 204 when no authors found', async()=>{
        mockFetchAll.mockResolvedValue([]);

        await getAllAuthors(req,res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({msg:"No any authors in the list yet"});
    })
})
