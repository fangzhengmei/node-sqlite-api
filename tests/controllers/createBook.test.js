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
                author_id : 1
            },
            user: {
                id: 1,
                username: 'testuser',
                role: 'user'
            }
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
            'SELECT * FROM books WHERE isbn = ?',
            ['1234567890']
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            `INSERT INTO books
    (title, isbn, published_year, author_id, created_by)
    VALUES
    (?,?,?,?,?)`,
            ['Test','1234567890',1996,1,1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Book created successfully'});
    }),

    test('Throw 409 if book already exists',async()=>{
        dbHelper.fetchFirst.mockResolvedValue({
                id : 1,
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1,
                created_at : '2025-09-12 06:47:02',
            });
        
        await expect(createBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists',
            statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

})
