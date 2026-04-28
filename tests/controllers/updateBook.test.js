import { beforeEach } from 'node:test';
import { updateBooks } from '../../controllers/booksController.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

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

    test('should update multiple fields successfully', async () => {
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

    test('should update single field successfully', async () => {
        req = {
            body: { title: 'New Title' },
            params: { id: 1 }
        };
        dbHelper.execute.mockResolvedValue();

        await updateBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET title = ? WHERE id = ?'),
            ['New Title', 1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book updated successfully' });
    });
});
