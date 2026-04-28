import { asyncHandler } from '../utils/asyncWrapper.js';
import { fetchFirst } from '../utils/dbRunMethodWrapper.js';
import db from '../config/connDB.js';
import { logger } from '../logger/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError.js';

export const checkIsbnDuplicate = asyncHandler(async (req, res, next) => {
    const { isbn } = req.body;
    const { id } = req.params;

    if (!isbn) {
        return next();
    }

    logger.info(`Checking ISBN duplicate: ${isbn}`);

    const checkSql = `SELECT * FROM books WHERE isbn = ?`;
    const existingBook = await fetchFirst(db, checkSql, [isbn]);

    if (existingBook) {
        if (id && existingBook.id === parseInt(id)) {
            return next();
        }
        logger.warn(`Duplicate ISBN error: ${isbn}`);
        return next(new ConflictError('Book with this ISBN already exists'));
    }

    next();
});

export const checkAuthorExists = asyncHandler(async (req, res, next) => {
    const { author_id } = req.body;

    if (!author_id) {
        return next();
    }

    logger.info(`Checking author existence: ${author_id}`);

    const checkSql = `SELECT * FROM authors WHERE id = ?`;
    const author = await fetchFirst(db, checkSql, [author_id]);

    if (!author) {
        logger.warn(`Invalid author_id: ${author_id}`);
        return next(new NotFoundError(`Author with id ${author_id} not found`));
    }

    next();
});

export const checkBookExists = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (!id) {
        return next();
    }

    logger.info(`Checking book existence: ${id}`);

    const checkSql = `SELECT * FROM books WHERE id = ?`;
    const book = await fetchFirst(db, checkSql, [id]);

    if (!book) {
        logger.warn(`Book not found: ${id}`);
        return next(new NotFoundError(`Book with id ${id} not found`));
    }

    next();
});

export const checkEmailDuplicate = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next();
    }

    logger.info(`Checking email duplicate: ${email}`);

    const checkSql = `SELECT * FROM authors WHERE email = ?`;
    const existingAuthor = await fetchFirst(db, checkSql, [email]);

    if (existingAuthor) {
        logger.warn(`Duplicate email error: ${email}`);
        return next(new ConflictError('Author with this email already exists'));
    }

    next();
});

export const checkAtLeastOneField = (req, res, next) => {
    const { title, isbn, published_year, author_id } = req.body;

    if (!title && !isbn && !published_year && !author_id) {
        logger.warn('No fields provided for update');
        return next(new ValidationError('At least one field must be provided to update'));
    }

    next();
};

export const checkAuthorExistsById = asyncHandler(async (req, res, next) => {
    const { authorId } = req.params;

    if (!authorId) {
        return next();
    }

    logger.info(`Checking author existence by id: ${authorId}`);

    const checkSql = `SELECT * FROM authors WHERE id = ?`;
    const author = await fetchFirst(db, checkSql, [authorId]);

    if (!author) {
        logger.warn(`Author not found: ${authorId}`);
        return next(new NotFoundError(`Author with id ${authorId} not found`));
    }

    next();
});
