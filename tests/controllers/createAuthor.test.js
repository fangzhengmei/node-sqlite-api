import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let createAuthor;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('createAuthor unit tests', ()=>{
    let req;
    let res;

    beforeEach(async ()=>{
        jest.resetModules();
        
        mockFetchFirst = jest.fn();
        mockFetchAll = jest.fn();
        mockExecute = jest.fn();
        
        await jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
            __esModule: true,
            fetchFirst: mockFetchFirst,
            fetchAll: mockFetchAll,
            execute: mockExecute
        }));
        
        const authorModule = await import('../../controllers/authorController.js');
        createAuthor = authorModule.createAuthor;

        req = {
            body : { name : 'Test', email : 'test@gmail.com'},
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should create a new author when email does not exist', async()=>{
        mockFetchFirst.mockResolvedValue(null);
        mockExecute.mockResolvedValue();

        await createAuthor(req, res);

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE email = ?'),
            ['test@gmail.com']
        );

        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            'INSERT INTO authors(name, email) VALUES (?,?)',
            ['Test','test@gmail.com']
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Author created successfully' });
    });

    test('throw error if the email already exists', async()=>{
        mockFetchFirst.mockResolvedValue({ id : 1, name : 'Test', email : 'test@gmail.com', createdAt : '2025-09-12 06:47:02' });

        await expect(createAuthor(req, res)).rejects.toMatchObject({
            message: 'Author with this email already exists',
            statusCode: 409
        });

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE email = ?'),
            ['test@gmail.com']
        );

        expect(mockExecute).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});
