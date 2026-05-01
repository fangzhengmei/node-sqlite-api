import {updateBooks} from '../../controllers/booksController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('update books controller method test',()=>{
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
            params : {id : 1}
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('Book does not exist',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 if ISBN already exists', async () => {
        req = {
            params: { id: 1 },
            body: { isbn: '1234567890' }
        };
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title' });
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, title: 'Another Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists, update it to something else',
            statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should update multiple fields successfully', async()=>{
        dbHelper.fetchFirst.mockResolvedValue({id: 1, title: 'Old Title', isbn: '1234567999'});
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req,res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET title = ?, isbn = ?, published_year = ?, author_id = ? WHERE id = ?'),
            ['Test', '1234567890', 1996, 1, 1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });

    test('should throw error when trying to update status directly', async()=>{
        req = {
            params: { id: 1 },
            body: { status: 'checked_out' }
        };
        
        dbHelper.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: expect.stringContaining('Status cannot be modified directly'),
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw error when trying to update total_copies directly', async()=>{
        req = {
            params: { id: 1 },
            body: { total_copies: 10 }
        };
        
        dbHelper.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: expect.stringContaining('Inventory fields'),
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw error when trying to update available_copies directly', async()=>{
        req = {
            params: { id: 1 },
            body: { available_copies: 5 }
        };
        
        dbHelper.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: expect.stringContaining('Inventory fields'),
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw error when no fields provided', async()=>{
        req = {
            params: { id: 1 },
            body: {}
        };
        
        dbHelper.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'At least one field must be provided to update',
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });
});
