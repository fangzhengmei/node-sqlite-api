import { jest } from '@jest/globals';

jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
  fetchAll: jest.fn(),
  fetchFirst: jest.fn(),
  execute: jest.fn()
}));

describe('update books controller method test', () => {
    let req;
    let res;
    let updateBooks;
    let dbHelper;

    beforeEach(async () => {
        jest.resetModules();
        
        const booksController = await import('../../controllers/booksController.js');
        updateBooks = booksController.updateBooks;
        
        const dbRunMethodWrapper = await import('../../utils/dbRunMethodWrapper.js');
        dbHelper = dbRunMethodWrapper;
        
        jest.clearAllMocks();
        req = {
            body: {
                title: 'Test',
                isbn: '1234567890',
                published_year: 1996,
                author_id: 1
            },
            params: { id: 1 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('Book does not exist', async () => {
        dbHelper.fetchFirst.mockResolvedValue(null);

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'No such book with id 1 exists in the books table',
            statusCode: 400
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 if ISBN already exists', async () => {
        req = {
            body: { isbn: '1234567890' },
            params: { id: 1 }
        };
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title' });
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 2, title: 'Another Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists, update it to something else',
            statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should update multiple fields successfully', async () => {
        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title', isbn: '1234567999' });
        dbHelper.fetchFirst.mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET title = ?, isbn = ?, published_year = ?, author_id = ? WHERE id = ?'),
            ['Test', '1234567890', 1996, 1, 1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });
});
