import { beforeEach, describe } from 'node:test';
import { createBooks } from '../../controllers/booksController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Create Books test', () => {
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
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
    });

    test('should create a book successfully', async () => {
        dbHelper.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelper.execute).toHaveBeenCalledWith(
            expect.anything(),
            `INSERT INTO books
            (title, isbn, published_year, author_id)
            VALUES
            (?,?,?,?)`,
            ['Test', '1234567890', 1996, 1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book created successfully' });
    });
});
