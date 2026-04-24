import { beforeEach } from 'node:test';
import {updateBooks} from '../../controllers/booksController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('update books controller method test',()=>{
    let req;
    let res;
    let regularUser;
    let adminUser;

    beforeEach(()=>{
        jest.clearAllMocks();
        regularUser = { id: 1, username: 'testuser', role: 'user' };
        adminUser = { id: 99, username: 'admin', role: 'admin' };
        req = {
            body : { 
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1
            },
            params : {id : 1},
            user: regularUser
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        };
    });

    test('Book does not exist - should return 404',async()=>{
        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 404
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 403 if user is not the creator and not admin', async () => {
        const bookCreatedByDifferentUser = { 
            id: 1, 
            title: 'Old Title', 
            created_by: 2 
        };
        dbHelper.fetchFirst.mockResolvedValue(bookCreatedByDifferentUser);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Access denied. You can only modify books you created or have admin privileges.',
            statusCode: 403
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should allow update if user is the creator', async () => {
        const bookCreatedByCurrentUser = { 
            id: 1, 
            title: 'Old Title', 
            isbn: '1234567999',
            created_by: 1 
        };
        dbHelper.fetchFirst.mockResolvedValue(bookCreatedByCurrentUser);
        dbHelper.fetchFirst.mockResolvedValueOnce(bookCreatedByCurrentUser);
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

    test('should allow update if user is admin', async () => {
        req.user = adminUser;
        const bookCreatedByDifferentUser = { 
            id: 1, 
            title: 'Old Title', 
            isbn: '1234567999',
            created_by: 2 
        };
        dbHelper.fetchFirst.mockResolvedValue(bookCreatedByDifferentUser);
        dbHelper.fetchFirst.mockResolvedValueOnce(bookCreatedByDifferentUser);
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req,res);

        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw 409 if ISBN already exists', async () => {
        const bookCreatedByCurrentUser = { 
            id: 1, 
            title: 'Old Title',
            created_by: 1
        };
        req.body = { isbn: '1234567890' };
        
        dbHelper.fetchFirst.mockResolvedValueOnce(bookCreatedByCurrentUser);
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, title: 'Another Book', isbn: '1234567890' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists, update it to something else',
            statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should allow update if ISBN is same as current book', async () => {
        const bookCreatedByCurrentUser = { 
            id: 1, 
            title: 'Old Title', 
            isbn: '1234567890',
            created_by: 1
        };
        req.body = { title: 'New Title', isbn: '1234567890' };
        
        dbHelper.fetchFirst.mockResolvedValueOnce(bookCreatedByCurrentUser);
        dbHelper.fetchFirst.mockResolvedValueOnce(bookCreatedByCurrentUser);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
})
