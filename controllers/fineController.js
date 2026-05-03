import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const getAllFines = asyncHandler(async (req, res) => {
    let { borrower_name, is_paid, page, limit } = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex = (page - 1) * limit;

    let sql = `
        SELECT f.*, 
               br.book_id, br.borrower_name, br.borrow_date, br.due_date, br.return_date,
               b.title, b.isbn
        FROM fines f
        JOIN borrow_records br ON f.borrow_record_id = br.id
        JOIN books b ON br.book_id = b.id
    `;
    const params = [];
    const searchFields = [];

    if (borrower_name) {
        searchFields.push(`br.borrower_name LIKE ?`);
        params.push(`%${borrower_name}%`);
    }

    if (is_paid !== undefined && is_paid !== null) {
        const paidValue = is_paid === 'true' || is_paid === '1' ? 1 : 0;
        searchFields.push(`f.is_paid = ?`);
        params.push(paidValue);
    }

    if (searchFields.length > 0) {
        sql += ` WHERE ` + searchFields.join(' AND ');
    }

    sql += ` ORDER BY f.created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, startIndex);

    logger.info(
        `Fetching fines | filters: borrower_name=${borrower_name || "any"}, is_paid=${is_paid || "any"}, page=${page}, limit=${limit}`
    );

    const fines = await fetchAll(db, sql, params);

    if (!fines || fines.length === 0) {
        logger.warn("No fines found for the given filters");
        return res.status(204).json({ msg: "No fines found" });
    }

    logger.info(`Fines retrieved successfully | count = ${fines.length}`);
    return res.status(200).json({
        msg: 'Fines retrieved successfully',
        data: fines,
        pagination: {
            page,
            limit,
            count: fines.length
        }
    });
});

export const getSingleFine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Attempting to retrieve fine with id: ${id}`);

    const sql = `
        SELECT f.*, 
               br.book_id, br.borrower_name, br.borrow_date, br.due_date, br.return_date,
               b.title, b.isbn
        FROM fines f
        JOIN borrow_records br ON f.borrow_record_id = br.id
        JOIN books b ON br.book_id = b.id
        WHERE f.id = ?
    `;

    const fine = await fetchFirst(db, sql, [id]);

    if (!fine) {
        logger.warn(`Fine with id ${id} does not exist`);
        const error = new Error(`Fine with id ${id} does not exist`);
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Fine retrieved successfully: id=${id}`);
    return res.status(200).json({
        msg: 'Fine retrieved successfully',
        data: fine
    });
});

export const payFine = asyncHandler(async (req, res) => {
    const { fine_id } = req.params;
    const { paid_date } = req.body;

    logger.info(`Attempting to pay fine with id: ${fine_id}`);

    const checkFineSQL = `
        SELECT f.*, br.borrower_name, br.book_id, b.title
        FROM fines f
        JOIN borrow_records br ON f.borrow_record_id = br.id
        JOIN books b ON br.book_id = b.id
        WHERE f.id = ?
    `;
    const fine = await fetchFirst(db, checkFineSQL, [fine_id]);

    if (!fine) {
        logger.warn(`Fine with id ${fine_id} does not exist`);
        const error = new Error(`Fine with id ${fine_id} does not exist`);
        error.statusCode = 404;
        throw error;
    }

    if (fine.is_paid === 1) {
        logger.warn(`Fine with id ${fine_id} is already paid`);
        const error = new Error('Fine is already paid');
        error.statusCode = 400;
        throw error;
    }

    const actualPaidDate = paid_date || new Date().toISOString().split('T')[0];

    const updateFineSQL = `
        UPDATE fines 
        SET is_paid = 1, paid_date = ? 
        WHERE id = ?
    `;
    await execute(db, updateFineSQL, [actualPaidDate, fine_id]);

    const getUpdatedFineSQL = `
        SELECT f.*, br.borrower_name, br.book_id, b.title
        FROM fines f
        JOIN borrow_records br ON f.borrow_record_id = br.id
        JOIN books b ON br.book_id = b.id
        WHERE f.id = ?
    `;
    const updatedFine = await fetchFirst(db, getUpdatedFineSQL, [fine_id]);

    logger.info(`Fine paid successfully: fine_id=${fine_id}, amount=${fine.fine_amount}`);
    return res.status(200).json({
        msg: 'Fine paid successfully',
        data: updatedFine
    });
});

export const getOverdueFinesReminder = asyncHandler(async (req, res) => {
    logger.info(`Generating overdue fines reminder`);

    const sql = `
        SELECT br.id AS borrow_id, br.book_id, br.borrower_name, 
               br.borrow_date, br.due_date, b.title, b.isbn,
               julianday('now') - julianday(br.due_date) AS overdue_days,
               (julianday('now') - julianday(br.due_date)) * 0.5 AS estimated_fine
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
        WHERE br.return_date IS NULL 
          AND date(br.due_date) < date('now')
        ORDER BY overdue_days DESC
    `;

    const overdueRecords = await fetchAll(db, sql, []);

    if (!overdueRecords || overdueRecords.length === 0) {
        logger.info("No overdue books found");
        return res.status(200).json({
            msg: 'No overdue books found',
            data: [],
            summary: {
                total_overdue: 0,
                total_estimated_fine: 0
            }
        });
    }

    const formattedRecords = overdueRecords.map(record => ({
        ...record,
        overdue_days: Math.floor(record.overdue_days),
        estimated_fine: parseFloat((Math.floor(record.overdue_days) * 0.5).toFixed(2))
    }));

    const totalOverdue = formattedRecords.length;
    const totalEstimatedFine = formattedRecords.reduce((sum, record) => sum + record.estimated_fine, 0);

    logger.warn(`Overdue reminder generated: total_overdue=${totalOverdue}, total_estimated_fine=${totalEstimatedFine}`);
    return res.status(200).json({
        msg: 'Overdue fines reminder generated successfully',
        data: formattedRecords,
        summary: {
            total_overdue: totalOverdue,
            total_estimated_fine: parseFloat(totalEstimatedFine.toFixed(2))
        }
    });
});
