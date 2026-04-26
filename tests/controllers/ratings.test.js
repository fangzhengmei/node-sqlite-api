import { jest } from '@jest/globals';

jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
  fetchAll: jest.fn(),
  fetchFirst: jest.fn(),
  execute: jest.fn()
}));

describe('Rating Controller Tests', () => {
    let req;
    let res;
    let createRating;
    let getRatingsByBookId;
    let dbHelpers;

    beforeEach(async () => {
        jest.resetModules();
        
        const ratingsController = await import('../../controllers/ratingsController.js');
        createRating = ratingsController.createRating;
        getRatingsByBookId = ratingsController.getRatingsByBookId;
        
        const dbRunMethodWrapper = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbRunMethodWrapper;
        
        jest.clearAllMocks();
        req = {
            query: {},
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('createRating', () => {
        test('should create rating successfully with valid data', async () => {
            req.body = {
                book_id: 1,
                rating: 5,
                comment: 'Great book!',
                reader_name: 'John Doe'
            };

            dbHelpers.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });
            dbHelpers.execute.mockResolvedValue();

            await createRating(req, res);

            expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT * FROM books'),
                [1]
            );
            expect(dbHelpers.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO ratings'),
                [1, 5, 'Great book!', 'John Doe']
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ msg: 'Rating created successfully' });
        });

        test('should create rating with minimal required fields', async () => {
            req.body = {
                book_id: 1,
                rating: 3
            };

            dbHelpers.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });
            dbHelpers.execute.mockResolvedValue();

            await createRating(req, res);

            expect(dbHelpers.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO ratings'),
                [1, 3, null, null]
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should throw error when book does not exist', async () => {
            req.body = {
                book_id: 999,
                rating: 5
            };

            dbHelpers.fetchFirst.mockResolvedValue(null);

            await expect(createRating(req, res)).rejects.toThrow('No such book with id 999 exists');
        });

        test('should reject rating of 0', async () => {
            req.body = {
                book_id: 1,
                rating: 0
            };

            await expect(createRating(req, res)).rejects.toThrow('Rating must be an integer between 1 and 5');
        });

        test('should reject rating of 6', async () => {
            req.body = {
                book_id: 1,
                rating: 6
            };

            await expect(createRating(req, res)).rejects.toThrow('Rating must be an integer between 1 and 5');
        });

        test('should reject decimal rating (1.5)', async () => {
            req.body = {
                book_id: 1,
                rating: 1.5
            };

            await expect(createRating(req, res)).rejects.toThrow('Rating must be an integer between 1 and 5');
        });

        test('should reject negative rating (-1)', async () => {
            req.body = {
                book_id: 1,
                rating: -1
            };

            await expect(createRating(req, res)).rejects.toThrow('Rating must be an integer between 1 and 5');
        });

        test('should reject comment exceeding 1000 characters', async () => {
            const longComment = 'a'.repeat(1001);
            req.body = {
                book_id: 1,
                rating: 5,
                comment: longComment
            };

            await expect(createRating(req, res)).rejects.toThrow('Comment cannot exceed 1000 characters');
        });

        test('should accept comment with exactly 1000 characters', async () => {
            const validComment = 'a'.repeat(1000);
            req.body = {
                book_id: 1,
                rating: 5,
                comment: validComment
            };

            dbHelpers.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });
            dbHelpers.execute.mockResolvedValue();

            await createRating(req, res);

            expect(dbHelpers.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('INSERT INTO ratings'),
                [1, 5, validComment, null]
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should reject reader_name exceeding 100 characters', async () => {
            const longName = 'a'.repeat(101);
            req.body = {
                book_id: 1,
                rating: 5,
                reader_name: longName
            };

            await expect(createRating(req, res)).rejects.toThrow('Reader name cannot exceed 100 characters');
        });

        test('should reject when book_id is missing', async () => {
            req.body = {
                rating: 5
            };

            await expect(createRating(req, res)).rejects.toThrow('Book ID is required');
        });

        test('should reject when rating is missing', async () => {
            req.body = {
                book_id: 1
            };

            await expect(createRating(req, res)).rejects.toThrow('Rating is required');
        });

        test('should reject book_id of 0', async () => {
            req.body = {
                book_id: 0,
                rating: 5
            };

            await expect(createRating(req, res)).rejects.toThrow('Book ID must be a positive integer');
        });

        test('should reject negative book_id', async () => {
            req.body = {
                book_id: -1,
                rating: 5
            };

            await expect(createRating(req, res)).rejects.toThrow('Book ID must be a positive integer');
        });

        test('should reject decimal book_id', async () => {
            req.body = {
                book_id: 1.5,
                rating: 5
            };

            await expect(createRating(req, res)).rejects.toThrow('Book ID must be a positive integer');
        });
    });

    describe('getRatingsByBookId', () => {
        test('should get ratings for a book with statistics', async () => {
            req.params = { book_id: 1 };
            req.query = { page: 1, limit: 10 };

            dbHelpers.fetchFirst
                .mockResolvedValueOnce({ id: 1, title: 'Test Book' })
                .mockResolvedValueOnce({ total: 5 })
                .mockResolvedValueOnce({ average_rating: 4.2, total_ratings: 5 });

            dbHelpers.fetchAll.mockResolvedValue([
                { id: 1, book_id: 1, rating: 5, comment: 'Great!', reader_name: 'John', created_at: '2025-01-01' },
                { id: 2, book_id: 1, rating: 4, comment: 'Good', reader_name: 'Jane', created_at: '2025-01-02' }
            ]);

            await getRatingsByBookId(req, res);

            expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT * FROM ratings'),
                [1, 10, 0]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                msg: 'Ratings retrieved successfully',
                data: expect.any(Array),
                statistics: expect.objectContaining({
                    average_rating: '4.2',
                    total_ratings: 5
                }),
                pagination: expect.objectContaining({
                    page: 1,
                    limit: 10,
                    total: 5
                })
            }));
        });

        test('should use default pagination values when not provided', async () => {
            req.params = { book_id: 1 };
            req.query = {};

            dbHelpers.fetchFirst
                .mockResolvedValueOnce({ id: 1, title: 'Test Book' })
                .mockResolvedValueOnce({ total: 0 })
                .mockResolvedValueOnce({ average_rating: null, total_ratings: 0 });

            dbHelpers.fetchAll.mockResolvedValue([]);

            await getRatingsByBookId(req, res);

            expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('SELECT * FROM ratings'),
                [1, 10, 0]
            );
        });

        test('should throw error when book does not exist', async () => {
            req.params = { book_id: 999 };

            dbHelpers.fetchFirst.mockResolvedValue(null);

            await expect(getRatingsByBookId(req, res)).rejects.toThrow('No such book with id 999 exists');
        });
    });
});
