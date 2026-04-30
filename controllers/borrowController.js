import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().replace('T', ' ').substring(0, 19);
};

const checkAndNotifyNextReservation = async (bookId) => {
    logger.info(`Checking reservations for book ${bookId} after return`);
    
    const checkInventorySql = `
        SELECT available_quantity FROM book_inventories WHERE book_id = ?
    `;
    const inventory = await fetchFirst(db, checkInventorySql, [bookId]);
    
    if (!inventory || inventory.available_quantity <= 0) {
        logger.info(`No available copies for book ${bookId}, skipping reservation notification`);
        return;
    }
    
    const getNextReservationSql = `
        SELECT r.*, readers.name AS reader_name, readers.email AS reader_email
        FROM reservations r
        JOIN readers ON r.reader_id = readers.id
        WHERE r.book_id = ? AND r.status = 'pending'
        ORDER BY r.queue_position ASC
        LIMIT 1
    `;
    
    const nextReservation = await fetchFirst(db, getNextReservationSql, [bookId]);
    
    if (nextReservation) {
        logger.info(`Notifying reader ${nextReservation.reader_id} about available book ${bookId}`);
        
        const updateReservationSql = `
            UPDATE reservations 
            SET status = 'notified', notified_at = ?
            WHERE id = ?
        `;
        await execute(db, updateReservationSql, [getCurrentDateTime(), nextReservation.id]);
        
        logger.info(`Reader ${nextReservation.reader_name} (${nextReservation.reader_email}) has been notified that book is available`);
    }
};

export const borrowBook = asyncHandler(async(req, res) => {
    const { reader_id, book_id, borrow_days = 14 } = req.body;
    
    logger.info(`Attempting to borrow book ${book_id} for reader ${reader_id}`);
    
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
    
    const checkReservationSql = `
        SELECT * FROM reservations 
        WHERE reader_id = ? AND book_id = ? AND status = 'pending'
    `;
    const existingReservation = await fetchFirst(db, checkReservationSql, [reader_id, book_id]);
    
    let canBorrow = false;
    let reservationToCancel = null;
    
    if (existingReservation) {
        if (existingReservation.queue_position === 1) {
            canBorrow = true;
            reservationToCancel = existingReservation.id;
            logger.info(`Reader ${reader_id} is first in reservation queue for book ${book_id}, allowing borrow`);
        } else {
            logger.warn(`Reader ${reader_id} has reservation but is not first in queue for book ${book_id}`);
            const error = new Error(`You have a reservation but are not first in queue. Current position: ${existingReservation.queue_position}`);
            error.statusCode = 400;
            throw error;
        }
    } else {
        const checkInventorySql = `
            SELECT available_quantity FROM book_inventories WHERE book_id = ?
        `;
        const inventory = await fetchFirst(db, checkInventorySql, [book_id]);
        
        if (!inventory || inventory.available_quantity <= 0) {
            logger.warn(`Book ${book_id} has no available copies`);
            const error = new Error(`This book has no available copies. You can make a reservation.`);
            error.statusCode = 400;
            throw error;
        }
        
        canBorrow = true;
    }
    
    if (canBorrow) {
        const currentDate = getCurrentDateTime();
        const dueDate = addDays(currentDate, borrow_days);
        
        const insertBorrowSql = `
            INSERT INTO borrow_records (reader_id, book_id, borrow_date, due_date, status)
            VALUES (?, ?, ?, ?, 'borrowed')
        `;
        await execute(db, insertBorrowSql, [reader_id, book_id, currentDate, dueDate]);
        
        const updateInventorySql = `
            UPDATE book_inventories 
            SET available_quantity = available_quantity - 1, updated_at = ?
            WHERE book_id = ?
        `;
        await execute(db, updateInventorySql, [currentDate, book_id]);
        
        if (reservationToCancel) {
            const cancelReservationSql = `
                UPDATE reservations 
                SET status = 'fulfilled'
                WHERE id = ?
            `;
            await execute(db, cancelReservationSql, [reservationToCancel]);
        }
        
        logger.info(`Book ${book_id} borrowed successfully by reader ${reader_id}`);
        return res.status(200).json({msg:'Book borrowed successfully'});
    }
});

export const returnBook = asyncHandler(async(req, res) => {
    const { id } = req.params;
    
    logger.info(`Attempting to return book for borrow record ${id}`);
    
    const getBorrowRecordSql = `SELECT * FROM borrow_records WHERE id = ?`;
    const borrowRecord = await fetchFirst(db, getBorrowRecordSql, [id]);
    
    if (!borrowRecord) {
        logger.warn(`Borrow record ${id} does not exist`);
        const error = new Error(`Borrow record with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }
    
    if (borrowRecord.status === 'returned') {
        logger.warn(`Borrow record ${id} has already been returned`);
        const error = new Error(`This book has already been returned`);
        error.statusCode = 400;
        throw error;
    }
    
    const currentDate = getCurrentDateTime();
    
    const updateBorrowSql = `
        UPDATE borrow_records 
        SET return_date = ?, status = 'returned', updated_at = ?
        WHERE id = ?
    `;
    await execute(db, updateBorrowSql, [currentDate, currentDate, id]);
    
    const updateInventorySql = `
        UPDATE book_inventories 
        SET available_quantity = available_quantity + 1, updated_at = ?
        WHERE book_id = ?
    `;
    await execute(db, updateInventorySql, [currentDate, borrowRecord.book_id]);
    
    logger.info(`Book ${borrowRecord.book_id} returned successfully`);
    
    await checkAndNotifyNextReservation(borrowRecord.book_id);
    
    return res.status(200).json({msg:'Book returned successfully'});
});

export const getAllBorrowRecords = asyncHandler(async(req, res) => {
    let { reader_id, book_id, status, page, limit } = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page - 1) * limit;
    
    let sql = `
        SELECT br.*, 
        readers.name AS reader_name, readers.email AS reader_email,
        books.title AS book_title, books.isbn AS book_isbn
        FROM borrow_records br
        JOIN readers ON br.reader_id = readers.id
        JOIN books ON br.book_id = books.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (reader_id) {
        conditions.push('br.reader_id = ?');
        params.push(reader_id);
    }
    if (book_id) {
        conditions.push('br.book_id = ?');
        params.push(book_id);
    }
    if (status) {
        conditions.push('br.status = ?');
        params.push(status.toLowerCase());
    }
    
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY br.borrow_date DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, startIndex);
    
    logger.info(
        `Fetching borrow records | filters: reader_id=${reader_id || "any"}, book_id=${book_id || "any"}, status=${status || "any"}, page=${page}, limit=${limit}`
    );
    
    const records = await fetchAll(db, sql, params);
    
    if (!records || records.length === 0) {
        logger.warn("No borrow records found for the given filters");
        return res.status(204).json({msg:"No borrow records found"});
    }
    
    logger.info(`Borrow records retrieved successfully | counts = ${records.length}`);
    return res.status(200).json({
        msg:'Borrow records retrieved successfully',
        data : records,
        pagination : {
            page : page,
            limit : limit,
            count : records.length
        }
    });
});

export const getSingleBorrowRecord = asyncHandler(async(req, res) => {
    const { id } = req.params;
    
    const sql = `
        SELECT br.*, 
        readers.name AS reader_name, readers.email AS reader_email,
        books.title AS book_title, books.isbn AS book_isbn
        FROM borrow_records br
        JOIN readers ON br.reader_id = readers.id
        JOIN books ON br.book_id = books.id
        WHERE br.id = ?
    `;
    
    logger.info(`Attempting to retrieve borrow record ${id}`);
    const record = await fetchFirst(db, sql, [id]);
    
    if (!record) {
        logger.warn(`Borrow record ${id} does not exist`);
        const error = new Error(`Borrow record with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }
    
    logger.info(`Borrow record retrieved successfully`);
    return res.status(200).json({msg:'Borrow record retrieved successfully', data : record});
});
