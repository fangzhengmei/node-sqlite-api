import { getAllBooks } from "../../controllers/booksController.js"
import * as dbHelpers from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('get All Books method test', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { query : {}},
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('should return books with default query params', async()=>{
        dbHelpers.fetchAll.mockResolvedValue([{
                    id : 1,
                    title : 'Test',
                    isbn : '1234567890',
                    published_year : 1996 , 
                    author_id : 1,
                    created_at : '2025-09-12 06:47:02',
                    author_name: 'Test'
                }]);
        
        await getAllBooks(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10,0])
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should apply title filter when provided', async()=>{
        req.query = { title : 'Test' , year : '2025'};
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id:1,
                title:'Test',
                isbn:'1234567890', 
                published_year:2025, 
                author_id: 1,
                author: 'Test Author'
            }
        ]);

        await getAllBooks(req,res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE books.title LIKE ? AND books.published_year = ?'),
            expect.arrayContaining(['%Test%', 2025, 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'books retreiveed sucessfully',
            data: expect.any(Array)
        }));
    });

    test('should return 204 when no books found', async()=>{
            dbHelpers.fetchAll.mockResolvedValue([]);
    
            await getAllBooks(req,res);
    
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({msg:"No any books in the list yet"});
    });
})
