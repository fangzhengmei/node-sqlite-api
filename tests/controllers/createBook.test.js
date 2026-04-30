import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let createBooks;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('Create Books test',()=>{
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
        createBooks = booksModule.createBooks;

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
        mockFetchFirst.mockResolvedValue(null);
        mockExecute.mockResolvedValue();

        await createBooks(req, res);

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books'),
            ['1234567890']
        );

        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            ['Test','1234567890',1996,1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Book created successfully'});
    });

    test('Throw 409 if book already exists',async()=>{
        mockFetchFirst
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

        expect(mockExecute).not.toHaveBeenCalled();
    });

})
