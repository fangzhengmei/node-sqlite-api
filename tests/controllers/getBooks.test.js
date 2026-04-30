import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let getAllBooks;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('get All Books method test', ()=>{
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
        
        const booksModule = await import('../../controllers/booksController.js');
        getAllBooks = booksModule.getAllBooks;

        req = { query : {}};
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('should return books with default query params', async()=>{
        mockFetchAll.mockResolvedValue([{
            id : 1,
            title : 'Test',
            isbn : '1234567890',
            published_year : 1996 , 
            author_id : 1,
            created_at : '2025-09-12 06:47:02',
            author: 'Test'
        }]);
        
        await getAllBooks(req,res);

        expect(mockFetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10,0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply title filter when provided', async()=>{
        req.query = { title : 'Test' , year : '2025'};
        mockFetchAll.mockResolvedValue([
            {
                id:1,
                title:'Test Book',
                isbn:'1234567890', 
                published_year:2025, 
                author_id: 1,
                author: 'Test Author'
            }
        ]);

        await getAllBooks(req,res);

        expect(mockFetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('books.title LIKE ?'),
            expect.arrayContaining(['%Test%', 2025, 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no books found', async()=>{
        mockFetchAll.mockResolvedValue([]);

        await getAllBooks(req,res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({msg:"No any books in the list yet"});
    });
})
