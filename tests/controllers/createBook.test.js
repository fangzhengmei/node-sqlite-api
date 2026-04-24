import { createBooks } from '../../controllers/booksController.js';
import * as dbHelper from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js');
jest.mock('../../logger/logger.js');

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
        };
    });

    test('should create a book if it does not already exist', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, name: 'Author' });
        dbHelper.executeAndGetLastId.mockResolvedValue(1);
        dbHelper.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM books WHERE isbn = ?'),
            ['1234567890']
        );

        expect(dbHelper.executeAndGetLastId).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO books'),
            ['Test', '1234567890', 1996, 1]
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Book created successfully' });
    });

    test('should throw 409 if book already exists', async () => {
        dbHelper.fetchFirst.mockResolvedValueOnce({
            id: 1,
            title: 'Test',
            isbn: '1234567890',
            published_year: 1996,
            author_id: 1,
            created_at: '2025-09-12 06:47:02',
        });

        await expect(createBooks(req, res)).rejects.toThrow('Book with this isbn already exists');

        expect(dbHelper.executeAndGetLastId).not.toHaveBeenCalled();
    });

    test('should throw 400 if author does not exist', async () => {
        dbHelper.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        await expect(createBooks(req, res)).rejects.toThrow('No such author with id 1 exists in the author table');

        expect(dbHelper.executeAndGetLastId).not.toHaveBeenCalled();
    });
});
