import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createRating = asyncHandler(async(req, res)=>{
    const { book_id, rating, comment, reader_name } = req.body;
    logger.info(`Attempting to create rating for book with id : ${book_id}`);
    
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
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
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
