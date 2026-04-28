import { checkIsbnDuplicate, checkAuthorExists, checkBookExists, checkEmailDuplicate, checkAtLeastOneField, checkAuthorExistsById } from '../../middlewares/businessValidators.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Business Validators', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {}
        };
        res = {};
        next = jest.fn();
    });

    describe('checkIsbnDuplicate', () => {
        test('should call next if ISBN is not provided', async () => {
            req.body = {};

            await checkIsbnDuplicate(req, res, next);

            expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if ISBN does not exist', async () => {
            req.body = { isbn: '1234567890' };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await checkIsbnDuplicate(req, res, next);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should throw ConflictError if ISBN exists and no id param', async () => {
            req.body = { isbn: '1234567890' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, isbn: '1234567890' });

            await checkIsbnDuplicate(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
            expect(next.mock.calls[0][0].message).toBe('Book with this ISBN already exists');
        });

        test('should call next if ISBN exists but belongs to same book (update)', async () => {
            req.body = { isbn: '1234567890' };
            req.params = { id: '1' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, isbn: '1234567890' });

            await checkIsbnDuplicate(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should throw ConflictError if ISBN exists and belongs to different book', async () => {
            req.body = { isbn: '1234567890' };
            req.params = { id: '2' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, isbn: '1234567890' });

            await checkIsbnDuplicate(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
        });
    });

    describe('checkAuthorExists', () => {
        test('should call next if author_id is not provided', async () => {
            req.body = {};

            await checkAuthorExists(req, res, next);

            expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if author exists', async () => {
            req.body = { author_id: 1 };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, name: 'Test Author' });

            await checkAuthorExists(req, res, next);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should throw NotFoundError if author does not exist', async () => {
            req.body = { author_id: 99 };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await checkAuthorExists(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
            expect(next.mock.calls[0][0].message).toBe('Author with id 99 not found');
        });
    });

    describe('checkBookExists', () => {
        test('should call next if id is not provided', async () => {
            req.params = {};

            await checkBookExists(req, res, next);

            expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if book exists', async () => {
            req.params = { id: '1' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, title: 'Test Book' });

            await checkBookExists(req, res, next);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should throw NotFoundError if book does not exist', async () => {
            req.params = { id: '99' };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await checkBookExists(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
            expect(next.mock.calls[0][0].message).toBe('Book with id 99 not found');
        });
    });

    describe('checkEmailDuplicate', () => {
        test('should call next if email is not provided', async () => {
            req.body = {};

            await checkEmailDuplicate(req, res, next);

            expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if email does not exist', async () => {
            req.body = { email: 'test@example.com' };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await checkEmailDuplicate(req, res, next);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should throw ConflictError if email exists', async () => {
            req.body = { email: 'test@example.com' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, email: 'test@example.com' });

            await checkEmailDuplicate(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
            expect(next.mock.calls[0][0].message).toBe('Author with this email already exists');
        });
    });

    describe('checkAtLeastOneField', () => {
        test('should throw ValidationError if no fields provided', async () => {
            req.body = {};

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            expect(next.mock.calls[0][0].message).toBe('At least one field must be provided to update');
        });

        test('should call next if title is provided', async () => {
            req.body = { title: 'New Title' };

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if isbn is provided', async () => {
            req.body = { isbn: '1234567890' };

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if published_year is provided', async () => {
            req.body = { published_year: 2025 };

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if author_id is provided', async () => {
            req.body = { author_id: 1 };

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if multiple fields are provided', async () => {
            req.body = { title: 'New Title', isbn: '1234567890' };

            checkAtLeastOneField(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });
    });

    describe('checkAuthorExistsById', () => {
        test('should call next if authorId is not provided', async () => {
            req.params = {};

            await checkAuthorExistsById(req, res, next);

            expect(dbHelper.fetchFirst).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should call next if author exists', async () => {
            req.params = { authorId: '1' };
            dbHelper.fetchFirst.mockResolvedValue({ id: 1, name: 'Test Author' });

            await checkAuthorExistsById(req, res, next);

            expect(dbHelper.fetchFirst).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        test('should throw NotFoundError if author does not exist', async () => {
            req.params = { authorId: '99' };
            dbHelper.fetchFirst.mockResolvedValue(null);

            await checkAuthorExistsById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
            expect(next.mock.calls[0][0].message).toBe('Author with id 99 not found');
        });
    });
});
