import { beforeEach } from 'node:test';
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
    })

    test('should throw 409 if ISBN already exists', async () => {
        req = {
        body: { isbn: '1234567890' }
        };
        //to find boo upon the furst call
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title' });
        //to simulate a duplicate book found
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, title: 'Another Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
        message: 'Book with this isbn already exists, update it to something else',
        statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should update multiple fields successfully', async()=>{
        dbHelper.fetchFirst.mockResolvedValue({id: 1, title: 'Old Title', isbn: '1234567999'});
        dbHelper.fetchFirst.mockResolvedValue(null);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req,res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET title = ?, isbn = ?, published_year = ?, author_id = ? WHERE id = ?'),
            ['Test', '1234567890', 1996, 1, 1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    })
})