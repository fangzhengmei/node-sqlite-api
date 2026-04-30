import { beforeEach, describe } from 'node:test';
import { createBooks } from '../../controllers/booksController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Create Books test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            body : { 
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1}
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should create a book if it doesnot already exist', async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books'),
            ['1234567890']
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            ['Test','1234567890',1996,1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Book created successfully'});
    });

    test('Throw 409 if book already exists',async()=>{
        dbHelper.fetchFirst
            .mockResolvedValueOnce({
                id : 1,
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1,
                created_at : '2025-09-12 06:47:02',
            });
        
        await expect(createBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists',
            statusCode: 409,
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

})