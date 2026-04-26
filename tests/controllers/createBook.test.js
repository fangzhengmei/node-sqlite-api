import { jest } from '@jest/globals';

jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
  fetchAll: jest.fn(),
  fetchFirst: jest.fn(),
  execute: jest.fn()
}));

describe('Create Books test', () => {
    let req;
    let res;
    let createBooks;
    let dbHelper;

    beforeEach(async () => {
        jest.resetModules();
        
        const booksController = await import('../../controllers/booksController.js');
        createBooks = booksController.createBooks;
        
        const dbRunMethodWrapper = await import('../../utils/dbRunMethodWrapper.js');
        dbHelper = dbRunMethodWrapper;
        
        jest.clearAllMocks();
        req = {
            body: {
                title: 'Test',
                isbn: '1234567890',
                published_year: 1996,
                author_id: 1
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should create a book if it does not already exist and author is valid', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelper.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books'),
            ['1234567890']
        );

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors'),
            [1]
        );

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            ['Test', '1234567890', 1996, 1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book created successfully' });
    });

    test('Throw 409 if book already exists', async () => {
        dbHelper.fetchFirst.mockResolvedValue({
            id: 1,
            title: 'Test',
            isbn: '1234567890',
            published_year: 1996,
            author_id: 1,
            created_at: '2025-09-12 06:47:02',
        });
        
        await expect(createBooks(req, res)).rejects.toThrow('Book with this isbn already exists');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('Throw 400 if author does not exist', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        
        await expect(createBooks(req, res)).rejects.toThrow('No such author with id 1 exists');

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });
});
