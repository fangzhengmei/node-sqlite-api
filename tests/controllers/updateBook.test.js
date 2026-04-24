import { updateBooks } from '../../controllers/booksController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

describe('update books controller method test', () => {
    let req;
    let res;

    beforeEach(() => {
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
            statusCode: 404
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should throw 409 if ISBN already exists', async () => {
        req = {
            body: { isbn: '1234567890' },
            params: { id: 1 }
        };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title' })
            .mockResolvedValueOnce({ id: 2, title: 'Another Book' });

        await expect(updateBooks(req, res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists, update it to something else',
            statusCode: 409
        });

        expect(dbHelper.execute).not.toHaveBeenCalled();
    });

    test('should update multiple fields successfully', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title', isbn: '1234567999' })
            .mockResolvedValueOnce(null);
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET'),
            expect.arrayContaining(['Test', '1234567890', 1996, 1, 1])
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });

    test('should throw 400 if no fields provided', async () => {
        req = {
            body: {},
            params: { id: 1 }
        };

        dbHelper.fetchFirst.mockResolvedValueOnce({ id: 1, title: 'Old Title' });

        await expect(updateBooks(req, res)).rejects.toThrow('At least one field must be provided to update');
    });

    test('should update category_ids successfully', async () => {
        req = {
            body: { category_ids: [1, 2] },
            params: { id: 1 }
        };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title' })
            .mockResolvedValueOnce({ id: 1, name: 'Category 1' })
            .mockResolvedValueOnce({ id: 2, name: 'Category 2' });
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should throw 404 if category_id does not exist', async () => {
        req = {
            body: { category_ids: [999] },
            params: { id: 1 }
        };

        dbHelper.fetchFirst
            .mockResolvedValueOnce({ id: 1, title: 'Old Title' })
            .mockResolvedValueOnce(null);

        await expect(updateBooks(req, res)).rejects.toThrow('No category with id 999 exists');
    });
});
