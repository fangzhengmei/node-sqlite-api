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

    test('should throw 400 when no fields are provided to update', async () => {
        req = {
            body: {},
            params: { id: 1 }
        };

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'At least one field must be provided to update',
            statusCode: 400
        });

        expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Book does not exist',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 if ISBN already exists for another book', async () => {
        req = {
        body: { isbn: '1234567890' },
        params: { id: 1 }
        };
        // First call: find the book by id
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title', isbn: '0987654321' });
        // Second call: check duplicate ISBN - found another book with same ISBN
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, title: 'Another Book', isbn: '1234567890' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
        message: 'Book with this isbn already exists, update it to something else',
        statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should not throw 409 when updating without changing ISBN', async () => {
        req = {
            body: { title: 'New Title', isbn: '1234567890' },
            params: { id: 1 }
        };
        // First call: find the book by id (same ISBN as being updated)
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title', isbn: '1234567890' });
        // Second call: check duplicate ISBN - no other book has this ISBN (returns null)
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET title = ?, isbn = ? WHERE id = ?'),
            ['New Title', '1234567890', 1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });

    test('should update multiple fields successfully', async()=>{
        // First call: find the book by id
        dbHelper.fetchFirst.mockResolvedValueOnce({id: 1, title: 'Old Title', isbn: '1234567999'});
        // Second call: check duplicate ISBN - no other book has this ISBN
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
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
});