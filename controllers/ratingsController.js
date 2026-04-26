import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createRating = asyncHandler(async(req, res)=>{
    const { book_id, rating, comment, reader_name } = req.body;
    logger.info(`Attempting to create rating for book with id : ${book_id}`);

    if (book_id === undefined || book_id === null) {
        const error = new Error('Book ID is required');
        error.statusCode = 400;
        throw error;
    }
    if (!Number.isInteger(book_id) || book_id < 1) {
        const error = new Error('Book ID must be a positive integer');
        error.statusCode = 400;
        throw error;
    }

    if (rating === undefined || rating === null) {
        const error = new Error('Rating is required');
        error.statusCode = 400;
        throw error;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        const error = new Error('Rating must be an integer between 1 and 5');
        error.statusCode = 400;
        throw error;
    }

    if (comment !== undefined && comment !== null && typeof comment === 'string' && comment.length > 1000) {
        const error = new Error('Comment cannot exceed 1000 characters');
        error.statusCode = 400;
        throw error;
    }

    if (reader_name !== undefined && reader_name !== null && typeof reader_name === 'string' && reader_name.length > 100) {
        const error = new Error('Reader name cannot exceed 100 characters');
        error.statusCode = 400;
        throw error;
    }
    
    const checkBookSQL = `
        SELECT * FROM books
        WHERE id = ?
    `;
    const book = await fetchFirst(db, checkBookSQL, [book_id]);
    if(!book){
        logger.warn(`Invalid book_id : ${book_id} while creating rating`);
        const error = new Error(`No such book with id ${book_id} exists`);
        error.statusCode = 400; 
        throw error;
    }
    
    const sql = `INSERT INTO ratings
    (book_id, rating, comment, reader_name)
    VALUES
    (?, ?, ?, ?)`;
    await execute(db, sql, [book_id, rating, comment || null, reader_name || null]);
    logger.info(`Rating created successfully for book id: ${book_id}, rating: ${rating}`);
    return res.status(201).json({msg:'Rating created successfully'});
});

export const getRatingsByBookId = asyncHandler(async(req, res)=>{
    const { book_id } = req.params;
    let { page, limit } = req.query;

    if (page !== undefined && page !== null && page !== '') {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || !Number.isInteger(pageNum) || pageNum < 1) {
            const error = new Error('Page number must be greater than 0');
            error.statusCode = 400;
            throw error;
        }
        page = pageNum;
    } else {
        page = 1;
    }

    if (limit !== undefined && limit !== null && limit !== '') {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || !Number.isInteger(limitNum) || limitNum < 1) {
            const error = new Error('Limit must be greater than 0');
            error.statusCode = 400;
            throw error;
        }
        limit = limitNum;
    } else {
        limit = 10;
    }

    const startIndex  = (page - 1) * limit;

    logger.info(`Fetching ratings for book id: ${book_id}, page: ${page}, limit: ${limit}`);
    
    const checkBookSQL = `
        SELECT * FROM books
        WHERE id = ?
    `;
    const book = await fetchFirst(db, checkBookSQL, [book_id]);
    if(!book){
        logger.warn(`Invalid book_id : ${book_id} while fetching ratings`);
        const error = new Error(`No such book with id ${book_id} exists`);
        error.statusCode = 404; 
        throw error;
    }

    const countSQL = `
        SELECT COUNT(*) as total FROM ratings 
        WHERE book_id = ?
    `;
    const countResult = await fetchFirst(db, countSQL, [book_id]);
    const total = countResult.total;

    const sql = `
        SELECT * FROM ratings 
        WHERE book_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `;
    const ratings = await fetchAll(db, sql, [book_id, limit, startIndex]);
    
    const statsSQL = `
        SELECT 
            AVG(rating) as average_rating,
            COUNT(*) as total_ratings
        FROM ratings 
        WHERE book_id = ?
    `;
    const stats = await fetchFirst(db, statsSQL, [book_id]);

    const response = {
        msg: 'Ratings retrieved successfully',
        data: ratings,
        statistics: {
            average_rating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : null,
            total_ratings: stats.total_ratings
        },
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };

    logger.info(`Ratings retrieved successfully for book id: ${book_id}, count: ${ratings.length}`);
    return res.status(200).json(response);
});
