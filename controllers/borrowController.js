import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const DAILY_FINE_RATE = 0.5;
const DEFAULT_LOAN_DAYS = 14;

const calculateDueDate = (borrowDate, loanDays) => {
    const date = new Date(borrowDate);
    date.setDate(date.getDate() + loanDays);
    return date.toISOString().split('T')[0];
};

const calculateOverdueDays = (dueDate, returnDate) => {
    const due = new Date(dueDate);
    const returned = new Date(returnDate);
    const diffTime = returned - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

const isBookBorrowed = async (bookId) => {
    const sql = `
        SELECT * FROM borrow_records 
        WHERE book_id = ? AND return_date IS NULL
    `;
    const record = await fetchFirst(db, sql, [bookId]);
    return !!record;
};

export const borrowBook = asyncHandler(async (req, res) => {
    const { book_id, borrower_name, loan_days } = req.body;
    const actualLoanDays = loan_days || DEFAULT_LOAN_DAYS;

    logger.info(`Attempting to borrow book with id: ${book_id} for borrower: ${borrower_name}`);

    const checkBookSQL = `SELECT * FROM books WHERE id = ?`;
    const book = await fetchFirst(db, checkBookSQL, [book_id]);

    if (!book) {
        logger.warn(`Book with id ${book_id} does not exist`);
        const error = new Error(`Book with id ${book_id} does not exist`);
        error.statusCode = 404;
        throw error;
    }

    const isBorrowed = await isBookBorrowed(book_id);
    if (isBorrowed) {
        logger.warn(`Book with id ${book_id} is already borrowed`);
        const error = new Error(`Book with id ${book_id} is already borrowed`);
        error.statusCode = 409;
        throw error;
    }

    const borrowDate = new Date().toISOString().split('T')[0];
    const dueDate = calculateDueDate(borrowDate, actualLoanDays);

    const sql = `
        INSERT INTO borrow_records (book_id, borrower_name, borrow_date, due_date)
        VALUES (?, ?, ?, ?)
    `;
    await execute(db, sql, [book_id, borrower_name, borrowDate, dueDate]);

    logger.info(`Book borrowed successfully: book_id=${book_id}, borrower=${borrower_name}, due_date=${dueDate}`);
    return res.status(200).json({
        msg: 'Book borrowed successfully',
        data: {
            book_id,
            borrower_name,
            borrow_date: borrowDate,
            due_date: dueDate
        }
    });
});

export const returnBook = asyncHandler(async (req, res) => {
    const { borrow_id } = req.params;
    const { return_date } = req.body;

    logger.info(`Attempting to return book for borrow record id: ${borrow_id}`);

    const checkBorrowSQL = `
        SELECT br.*, b.title, b.isbn 
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
        WHERE br.id = ?
    `;
    const borrowRecord = await fetchFirst(db, checkBorrowSQL, [borrow_id]);

    if (!borrowRecord) {
        logger.warn(`Borrow record with id ${borrow_id} does not exist`);
        const error = new Error(`Borrow record with id ${borrow_id} does not exist`);
        error.statusCode = 404;
        throw error;
    }

    if (borrowRecord.return_date) {
        logger.warn(`Book already returned for borrow record id: ${borrow_id}`);
        const error = new Error('Book already returned');
        error.statusCode = 400;
        throw error;
    }

    const actualReturnDate = return_date || new Date().toISOString().split('T')[0];
    const overdueDays = calculateOverdueDays(borrowRecord.due_date, actualReturnDate);
    const fineAmount = overdueDays * DAILY_FINE_RATE;

    const updateBorrowSQL = `
        UPDATE borrow_records 
        SET return_date = ? 
        WHERE id = ?
    `;
    await execute(db, updateBorrowSQL, [actualReturnDate, borrow_id]);

    let fineRecord = null;
    if (overdueDays > 0) {
        const insertFineSQL = `
            INSERT INTO fines (borrow_record_id, fine_amount, fine_days)
            VALUES (?, ?, ?)
        `;
        await execute(db, insertFineSQL, [borrow_id, fineAmount, overdueDays]);

        const getFineSQL = `SELECT * FROM fines WHERE borrow_record_id = ?`;
        fineRecord = await fetchFirst(db, getFineSQL, [borrow_id]);

        logger.warn(`Book returned overdue: borrow_id=${borrow_id}, overdue_days=${overdueDays}, fine_amount=${fineAmount}`);
    }

    logger.info(`Book returned successfully: borrow_id=${borrow_id}, return_date=${actualReturnDate}`);
    return res.status(200).json({
        msg: 'Book returned successfully',
        data: {
            borrow_id,
            book_id: borrowRecord.book_id,
            book_title: borrowRecord.title,
            borrower_name: borrowRecord.borrower_name,
            borrow_date: borrowRecord.borrow_date,
            due_date: borrowRecord.due_date,
            return_date: actualReturnDate,
            overdue_days: overdueDays,
            fine: fineRecord
        }
    });
});

export const getAllBorrowRecords = asyncHandler(async (req, res) => {
    let { borrower_name, status, page, limit } = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex = (page - 1) * limit;

    let sql = `
        SELECT br.*, b.title, b.isbn, 
               CASE WHEN br.return_date IS NOT NULL THEN 'returned' ELSE 'borrowed' END AS status
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
    `;
    const params = [];
    const searchFields = [];

    if (borrower_name) {
        searchFields.push(`br.borrower_name LIKE ?`);
        params.push(`%${borrower_name}%`);
    }

    if (status) {
        if (status === 'borrowed') {
            searchFields.push(`br.return_date IS NULL`);
        } else if (status === 'returned') {
            searchFields.push(`br.return_date IS NOT NULL`);
        } else if (status === 'overdue') {
            searchFields.push(`br.return_date IS NULL AND date(br.due_date) < date('now')`);
        }
    }

    if (searchFields.length > 0) {
        sql += ` WHERE ` + searchFields.join(' AND ');
    }

    sql += ` ORDER BY br.created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, startIndex);

    logger.info(
        `Fetching borrow records | filters: borrower_name=${borrower_name || "any"}, status=${status || "any"}, page=${page}, limit=${limit}`
    );

    const records = await fetchAll(db, sql, params);

    if (!records || records.length === 0) {
        logger.warn("No borrow records found for the given filters");
        return res.status(204).json({ msg: "No borrow records found" });
    }

    logger.info(`Borrow records retrieved successfully | count = ${records.length}`);
    return res.status(200).json({
        msg: 'Borrow records retrieved successfully',
        data: records,
        pagination: {
            page,
            limit,
            count: records.length
        }
    });
});

export const getSingleBorrowRecord = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Attempting to retrieve borrow record with id: ${id}`);

    const sql = `
        SELECT br.*, b.title, b.isbn, a.name AS author_name,
               CASE WHEN br.return_date IS NOT NULL THEN 'returned' ELSE 'borrowed' END AS status
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
        JOIN authors a ON b.author_id = a.id
        WHERE br.id = ?
    `;

    const record = await fetchFirst(db, sql, [id]);

    if (!record) {
        logger.warn(`Borrow record with id ${id} does not exist`);
        const error = new Error(`Borrow record with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }

    const getFineSQL = `SELECT * FROM fines WHERE borrow_record_id = ?`;
    const fine = await fetchFirst(db, getFineSQL, [id]);

    record.fine = fine || null;

    if (record.status === 'borrowed') {
        const today = new Date().toISOString().split('T')[0];
        const overdueDays = calculateOverdueDays(record.due_date, today);
        if (overdueDays > 0) {
            record.is_overdue = true;
            record.current_overdue_days = overdueDays;
            record.estimated_fine = overdueDays * DAILY_FINE_RATE;
        } else {
            record.is_overdue = false;
            record.current_overdue_days = 0;
            record.estimated_fine = 0;
        }
    }

    logger.info(`Borrow record retrieved successfully: id=${id}`);
    return res.status(200).json({
        msg: 'Borrow record retrieved successfully',
        data: record
    });
});
