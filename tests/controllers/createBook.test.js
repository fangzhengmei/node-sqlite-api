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
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelper.execute.mockResolvedValue({ lastID: 100 });

        await createBooks(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            'SELECT * FROM books WHERE isbn = ?',
            ['1234567890']
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            expect.arrayContaining(['Test','1234567890',1996,1])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Book created successfully',
            data: expect.objectContaining({
                id: 100,
                title: 'Test',
                isbn: '1234567890',
                status: 'available'
            })
        }));
    });

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

    test('should create book with custom total_copies', async()=>{
        req.body.total_copies = 5;
        
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelper.execute.mockResolvedValue({ lastID: 100 });

        await createBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            expect.arrayContaining([5, 5, 'available'])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw error if total_copies is less than 1', async()=>{
        req.body.total_copies = 0;
        
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, name: 'Test Author' });

        await expect(createBooks(req, res)).rejects.toMatchObject({
            message: 'Total copies must be at least 1',
            statusCode: 400
        });
    });

    test('should create book with valid initial status', async()=>{
        req.body.status = 'damaged';
        req.body.total_copies = 3;
        
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelper.execute.mockResolvedValue({ lastID: 100 });

        await createBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            expect.arrayContaining([3, 0, 'damaged'])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw error for invalid initial status', async()=>{
        req.body.status = 'checked_out';
        
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, name: 'Test Author' });

        await expect(createBooks(req, res)).rejects.toMatchObject({
            message: expect.stringContaining('Invalid initial status'),
            statusCode: 400
        });
    });
});
