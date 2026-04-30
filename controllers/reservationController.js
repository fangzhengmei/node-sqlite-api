import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result.toISOString().replace('T', ' ').substring(0, 19);
};

const adjustQueueAfterCancellation = async (bookId, cancelledPosition) => {
    logger.info(`Adjusting reservation queue for book ${bookId} after cancellation at position ${cancelledPosition}`);
    
    const updateQueueSql = `
        UPDATE reservations 
        SET queue_position = queue_position - 1
        WHERE book_id = ? AND status = 'pending' AND queue_position > ?
    `;
    await execute(db, updateQueueSql, [bookId, cancelledPosition]);
    
    logger.info(`Queue adjusted for book ${bookId}`);
};

export const checkExpiredReservations = asyncHandler(async(req, res) => {
    logger.info('Checking for expired reservations');
    
    const currentDateTime = getCurrentDateTime();
    
    const getExpiredSql = `
        SELECT * FROM reservations 
        WHERE status = 'pending' AND expires_at < ?
    `;
    const expiredReservations = await fetchAll(db, getExpiredSql, [currentDateTime]);
    
    if (expiredReservations.length === 0) {
        logger.info('No expired reservations found');
        return res.status(200).json({msg:'No expired reservations found', expired_count: 0});
    }
    
    const bookPositions = new Map();
    
    for (const reservation of expiredReservations) {
        const key = reservation.book_id;
        if (!bookPositions.has(key)) {
            bookPositions.set(key, []);
        }
        bookPositions.get(key).push(reservation.queue_position);
    }
    
    const updateExpiredSql = `
        UPDATE reservations 
        SET status = 'expired'
        WHERE status = 'pending' AND expires_at < ?
    `;
    await execute(db, updateExpiredSql, [currentDateTime]);
    
    for (const [bookId, positions] of bookPositions) {
        positions.sort((a, b) => a - b);
        for (let i = positions.length - 1; i >= 0; i--) {
            await adjustQueueAfterCancellation(bookId, positions[i]);
        }
    }
    
    logger.info(`Processed ${expiredReservations.length} expired reservations`);
    return res.status(200).json({
        msg:'Expired reservations processed successfully', 
        expired_count: expiredReservations.length
    });
});

export const createReservation = asyncHandler(async(req, res) => {
    const { reader_id, book_id, expire_hours = 24 } = req.body;
    
    logger.info(`Attempting to create reservation for book ${book_id} by reader ${reader_id}`);
    
    const checkReaderSql = `SELECT * FROM readers WHERE id = ?`;
    const reader = await fetchFirst(db, checkReaderSql, [reader_id]);
    if (!reader) {
        logger.warn(`Reader ${reader_id} does not exist`);
        const error = new Error(`Reader with id ${reader_id} does not exist`);
        error.statusCode = 400;
        throw error;
    }
    
    const checkBookSql = `SELECT * FROM books WHERE id = ?`;
    const book = await fetchFirst(db, checkBookSql, [book_id]);
    if (!book) {
        logger.warn(`Book ${book_id} does not exist`);
        const error = new Error(`Book with id ${book_id} does not exist`);
        error.statusCode = 400;
        throw error;
    }
    
    const checkExistingReservationSql = `
        SELECT * FROM reservations 
        WHERE reader_id = ? AND book_id = ? AND status IN ('pending', 'notified')
    `;
    const existingReservation = await fetchFirst(db, checkExistingReservationSql, [reader_id, book_id]);
    if (existingReservation) {
        logger.warn(`Reader ${reader_id} already has an active reservation for book ${book_id}`);
        const error = new Error(`You already have an active reservation for this book`);
        error.statusCode = 400;
        throw error;
    }
    
    const checkExistingBorrowSql = `
        SELECT * FROM borrow_records 
        WHERE reader_id = ? AND book_id = ? AND status = 'borrowed'
    `;
    const existingBorrow = await fetchFirst(db, checkExistingBorrowSql, [reader_id, book_id]);
    if (existingBorrow) {
        logger.warn(`Reader ${reader_id} already has book ${book_id} borrowed`);
        const error = new Error(`You already have this book borrowed`);
        error.statusCode = 400;
        throw error;
    }
    
    const checkInventorySql = `
        SELECT available_quantity FROM book_inventories WHERE book_id = ?
    `;
    const inventory = await fetchFirst(db, checkInventorySql, [book_id]);
    
    if (inventory && inventory.available_quantity > 0) {
        logger.warn(`Book ${book_id} has available copies, no need for reservation`);
        const error = new Error(`This book has available copies. You can borrow it directly.`);
        error.statusCode = 400;
        throw error;
    }
    
    const getQueuePositionSql = `
        SELECT COUNT(*) as count FROM reservations 
        WHERE book_id = ? AND status = 'pending'
    `;
    const queueResult = await fetchFirst(db, getQueuePositionSql, [book_id]);
    const queuePosition = (queueResult?.count || 0) + 1;
    
    const currentDateTime = getCurrentDateTime();
    const expiresAt = addHours(currentDateTime, expire_hours);
    
    const insertReservationSql = `
        INSERT INTO reservations (reader_id, book_id, queue_position, status, expires_at)
        VALUES (?, ?, ?, 'pending', ?)
    `;
    await execute(db, insertReservationSql, [reader_id, book_id, queuePosition, expiresAt]);
    
    logger.info(`Reservation created successfully for book ${book_id} by reader ${reader_id}, position: ${queuePosition}`);
    return res.status(200).json({
        msg:'Reservation created successfully',
        data: {
            queue_position: queuePosition,
            expires_at: expiresAt
        }
    });
});

export const cancelReservation = asyncHandler(async(req, res) => {
    const { id } = req.params;
    
    logger.info(`Attempting to cancel reservation ${id}`);
    
    const getReservationSql = `SELECT * FROM reservations WHERE id = ?`;
    const reservation = await fetchFirst(db, getReservationSql, [id]);
    
    if (!reservation) {
        logger.warn(`Reservation ${id} does not exist`);
        const error = new Error(`Reservation with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }
    
    if (reservation.status !== 'pending' && reservation.status !== 'notified') {
        logger.warn(`Reservation ${id} cannot be cancelled, status: ${reservation.status}`);
        const error = new Error(`This reservation cannot be cancelled. Current status: ${reservation.status}`);
        error.statusCode = 400;
        throw error;
    }
    
    const cancelledPosition = reservation.queue_position;
    const bookId = reservation.book_id;
    
    const updateReservationSql = `
        UPDATE reservations 
        SET status = 'cancelled'
        WHERE id = ?
    `;
    await execute(db, updateReservationSql, [id]);
    
    await adjustQueueAfterCancellation(bookId, cancelledPosition);
    
    logger.info(`Reservation ${id} cancelled successfully`);
    return res.status(200).json({msg:'Reservation cancelled successfully'});
});

export const getAllReservations = asyncHandler(async(req, res) => {
    let { reader_id, book_id, status, page, limit } = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page - 1) * limit;
    
    let sql = `
        SELECT r.*, 
        readers.name AS reader_name, readers.email AS reader_email,
        books.title AS book_title, books.isbn AS book_isbn
        FROM reservations r
        JOIN readers ON r.reader_id = readers.id
        JOIN books ON r.book_id = books.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (reader_id) {
        conditions.push('r.reader_id = ?');
        params.push(reader_id);
    }
    if (book_id) {
        conditions.push('r.book_id = ?');
        params.push(book_id);
    }
    if (status) {
        conditions.push('r.status = ?');
        params.push(status.toLowerCase());
    }
    
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY r.book_id ASC, r.queue_position ASC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, startIndex);
    
    logger.info(
        `Fetching reservations | filters: reader_id=${reader_id || "any"}, book_id=${book_id || "any"}, status=${status || "any"}, page=${page}, limit=${limit}`
    );
    
    const reservations = await fetchAll(db, sql, params);
    
    if (!reservations || reservations.length === 0) {
        logger.warn("No reservations found for the given filters");
        return res.status(204).json({msg:"No reservations found"});
    }
    
    logger.info(`Reservations retrieved successfully | counts = ${reservations.length}`);
    return res.status(200).json({
        msg:'Reservations retrieved successfully',
        data : reservations,
        pagination : {
            page : page,
            limit : limit,
            count : reservations.length
        }
    });
});

export const getSingleReservation = asyncHandler(async(req, res) => {
    const { id } = req.params;
    
    const sql = `
        SELECT r.*, 
        readers.name AS reader_name, readers.email AS reader_email,
        books.title AS book_title, books.isbn AS book_isbn
        FROM reservations r
        JOIN readers ON r.reader_id = readers.id
        JOIN books ON r.book_id = books.id
        WHERE r.id = ?
    `;
    
    logger.info(`Attempting to retrieve reservation ${id}`);
    const reservation = await fetchFirst(db, sql, [id]);
    
    if (!reservation) {
        logger.warn(`Reservation ${id} does not exist`);
        const error = new Error(`Reservation with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }
    
    logger.info(`Reservation retrieved successfully`);
    return res.status(200).json({msg:'Reservation retrieved successfully', data : reservation});
});
