import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { BookStates, BookEvents, canTransition, getNextState, isValidState } from "../utils/stateMachine.js";
import { logger } from "../logger/logger.js";

const DEFAULT_LOAN_DAYS = 14;
const DEFAULT_RESERVATION_HOURS = 24;

export async function logStatusChange(bookId, previousStatus, newStatus, event, userId, loanId = null, reservationId = null, notes = null) {
    const sql = `
        INSERT INTO status_history (book_id, previous_status, new_status, event, user_id, loan_id, reservation_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(db, sql, [bookId, previousStatus, newStatus, event, userId, loanId, reservationId, notes]);
    logger.info(`Status change logged: book ${bookId} from ${previousStatus} to ${newStatus} via ${event}`);
}

export async function getBookById(bookId) {
    const sql = `SELECT * FROM books WHERE id = ?`;
    return await fetchFirst(db, sql, [bookId]);
}

export async function updateBookStatus(bookId, newStatus, event, userId, loanId = null, reservationId = null, notes = null) {
    const book = await getBookById(bookId);
    if (!book) {
        throw new Error(`Book with id ${bookId} not found`);
    }

    if (!isValidState(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
    }

    const previousStatus = book.status;
    
    const updateSql = `UPDATE books SET status = ? WHERE id = ?`;
    await execute(db, updateSql, [newStatus, bookId]);

    await logStatusChange(bookId, previousStatus, newStatus, event, userId, loanId, reservationId, notes);

    return { previousStatus, newStatus };
}

export async function reserveBook(bookId, userId, reservationHours = DEFAULT_RESERVATION_HOURS) {
    const book = await getBookById(bookId);
    if (!book) {
        throw new Error(`Book with id ${bookId} not found`);
    }

    if (!canTransition(book.status, BookEvents.RESERVE)) {
        throw new Error(`Cannot reserve book with status ${book.status}`);
    }

    if (book.available_copies <= 0) {
        throw new Error(`No available copies for book ${bookId}`);
    }

    const activeReservation = await fetchFirst(db, 
        `SELECT * FROM reservations WHERE book_id = ? AND user_id = ? AND status = 'active'`,
        [bookId, userId]
    );
    
    if (activeReservation) {
        throw new Error(`User ${userId} already has an active reservation for book ${bookId}`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + reservationHours);

    const reservationSql = `
        INSERT INTO reservations (book_id, user_id, expires_at)
        VALUES (?, ?, ?)
    `;
    const result = await execute(db, reservationSql, [bookId, userId, expiresAt.toISOString()]);
    const reservationId = result.lastID;

    const newStatus = getNextState(book.status, BookEvents.RESERVE);
    await updateBookStatus(bookId, newStatus, BookEvents.RESERVE, userId, null, reservationId, `Reservation created for user ${userId}`);

    logger.info(`Book ${bookId} reserved by user ${userId}, expires at ${expiresAt.toISOString()}`);
    
    return {
        reservationId,
        bookId,
        userId,
        status: 'active',
        expiresAt: expiresAt.toISOString()
    };
}

export async function cancelReservation(reservationId, userId) {
    const reservation = await fetchFirst(db, 
        `SELECT * FROM reservations WHERE id = ? AND user_id = ?`,
        [reservationId, userId]
    );

    if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found for user ${userId}`);
    }

    if (reservation.status !== 'active') {
        throw new Error(`Reservation ${reservationId} is not active`);
    }

    const book = await getBookById(reservation.book_id);
    if (!book) {
        throw new Error(`Book with id ${reservation.book_id} not found`);
    }

    if (!canTransition(book.status, BookEvents.CANCEL_RESERVATION)) {
        throw new Error(`Cannot cancel reservation for book with status ${book.status}`);
    }

    const cancelledAt = new Date().toISOString();
    await execute(db, 
        `UPDATE reservations SET status = 'cancelled', cancelled_at = ? WHERE id = ?`,
        [cancelledAt, reservationId]
    );

    const newStatus = getNextState(book.status, BookEvents.CANCEL_RESERVATION);
    await updateBookStatus(
        book.id, 
        newStatus, 
        BookEvents.CANCEL_RESERVATION, 
        userId, 
        null, 
        reservationId, 
        `Reservation cancelled by user ${userId}`
    );

    logger.info(`Reservation ${reservationId} cancelled by user ${userId}`);
    
    return {
        reservationId,
        bookId: book.id,
        userId,
        status: 'cancelled',
        cancelledAt
    };
}

export async function activateReservation(reservationId, userId, loanDays = DEFAULT_LOAN_DAYS) {
    const reservation = await fetchFirst(db, 
        `SELECT * FROM reservations WHERE id = ? AND user_id = ?`,
        [reservationId, userId]
    );

    if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found for user ${userId}`);
    }

    if (reservation.status !== 'active') {
        throw new Error(`Reservation ${reservationId} is not active`);
    }

    const now = new Date();
    if (new Date(reservation.expires_at) < now) {
        throw new Error(`Reservation ${reservationId} has expired`);
    }

    const book = await getBookById(reservation.book_id);
    if (!book) {
        throw new Error(`Book with id ${reservation.book_id} not found`);
    }

    if (!canTransition(book.status, BookEvents.CHECKOUT)) {
        throw new Error(`Cannot activate reservation for book with status ${book.status}`);
    }

    if (book.available_copies <= 0) {
        throw new Error(`No available copies for book ${book.id}`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    const loanSql = `
        INSERT INTO loans (book_id, user_id, due_date)
        VALUES (?, ?, ?)
    `;
    const loanResult = await execute(db, loanSql, [book.id, userId, dueDate.toISOString()]);
    const loanId = loanResult.lastID;

    const activatedAt = new Date().toISOString();
    await execute(db, 
        `UPDATE reservations SET status = 'activated', activated_at = ? WHERE id = ?`,
        [activatedAt, reservationId]
    );

    await execute(db, 
        `UPDATE books SET available_copies = available_copies - 1 WHERE id = ?`,
        [book.id]
    );

    const newStatus = getNextState(book.status, BookEvents.CHECKOUT);
    await updateBookStatus(
        book.id, 
        newStatus, 
        BookEvents.CHECKOUT, 
        userId, 
        loanId, 
        reservationId, 
        `Reservation activated by user ${userId}, loan created`
    );

    logger.info(`Reservation ${reservationId} activated by user ${userId}, loan ${loanId} created`);
    
    return {
        loanId,
        reservationId,
        bookId: book.id,
        userId,
        status: 'active',
        checkoutDate: new Date().toISOString(),
        dueDate: dueDate.toISOString()
    };
}

export async function checkoutBook(bookId, userId, loanDays = DEFAULT_LOAN_DAYS) {
    const book = await getBookById(bookId);
    if (!book) {
        throw new Error(`Book with id ${bookId} not found`);
    }

    if (!canTransition(book.status, BookEvents.CHECKOUT)) {
        throw new Error(`Cannot checkout book with status ${book.status}`);
    }

    if (book.available_copies <= 0) {
        throw new Error(`No available copies for book ${bookId}`);
    }

    const activeLoan = await fetchFirst(db, 
        `SELECT * FROM loans WHERE book_id = ? AND user_id = ? AND status = 'active'`,
        [bookId, userId]
    );
    
    if (activeLoan) {
        throw new Error(`User ${userId} already has an active loan for book ${bookId}`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    const loanSql = `
        INSERT INTO loans (book_id, user_id, due_date)
        VALUES (?, ?, ?)
    `;
    const result = await execute(db, loanSql, [bookId, userId, dueDate.toISOString()]);
    const loanId = result.lastID;

    await execute(db, 
        `UPDATE books SET available_copies = available_copies - 1 WHERE id = ?`,
        [bookId]
    );

    const newStatus = getNextState(book.status, BookEvents.CHECKOUT);
    await updateBookStatus(
        bookId, 
        newStatus, 
        BookEvents.CHECKOUT, 
        userId, 
        loanId, 
        null, 
        `Book checked out by user ${userId}`
    );

    logger.info(`Book ${bookId} checked out by user ${userId}, loan ${loanId} created`);
    
    return {
        loanId,
        bookId,
        userId,
        status: 'active',
        checkoutDate: new Date().toISOString(),
        dueDate: dueDate.toISOString()
    };
}

export async function returnBook(loanId, userId) {
    const loan = await fetchFirst(db, 
        `SELECT * FROM loans WHERE id = ? AND user_id = ?`,
        [loanId, userId]
    );

    if (!loan) {
        throw new Error(`Loan ${loanId} not found for user ${userId}`);
    }

    if (loan.status !== 'active' && loan.status !== 'overdue') {
        throw new Error(`Loan ${loanId} is not active or overdue`);
    }

    const book = await getBookById(loan.book_id);
    if (!book) {
        throw new Error(`Book with id ${loan.book_id} not found`);
    }

    if (!canTransition(book.status, BookEvents.RETURN)) {
        throw new Error(`Cannot return book with status ${book.status}`);
    }

    const returnDate = new Date().toISOString();
    await execute(db, 
        `UPDATE loans SET status = 'returned', return_date = ? WHERE id = ?`,
        [returnDate, loanId]
    );

    await execute(db, 
        `UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`,
        [book.id]
    );

    const newStatus = getNextState(book.status, BookEvents.RETURN);
    await updateBookStatus(
        book.id, 
        newStatus, 
        BookEvents.RETURN, 
        userId, 
        loanId, 
        null, 
        `Book returned by user ${userId}`
    );

    logger.info(`Book ${book.id} returned by user ${userId}, loan ${loanId} closed`);
    
    return {
        loanId,
        bookId: book.id,
        userId,
        status: 'returned',
        returnDate
    };
}

export async function markOverdue(loanId) {
    const loan = await fetchFirst(db, `SELECT * FROM loans WHERE id = ?`, [loanId]);

    if (!loan) {
        throw new Error(`Loan ${loanId} not found`);
    }

    if (loan.status !== 'active') {
        throw new Error(`Loan ${loanId} is not active`);
    }

    const dueDate = new Date(loan.due_date);
    const now = new Date();
    
    if (dueDate >= now) {
        throw new Error(`Loan ${loanId} is not yet overdue`);
    }

    const book = await getBookById(loan.book_id);
    if (!book) {
        throw new Error(`Book with id ${loan.book_id} not found`);
    }

    if (!canTransition(book.status, BookEvents.MARK_OVERDUE)) {
        throw new Error(`Cannot mark book as overdue with status ${book.status}`);
    }

    await execute(db, `UPDATE loans SET status = 'overdue' WHERE id = ?`, [loanId]);

    const newStatus = getNextState(book.status, BookEvents.MARK_OVERDUE);
    await updateBookStatus(
        book.id, 
        newStatus, 
        BookEvents.MARK_OVERDUE, 
        loan.user_id, 
        loanId, 
        null, 
        `Book marked as overdue, due date was ${loan.due_date}`
    );

    logger.info(`Book ${book.id} marked as overdue, loan ${loanId}`);
    
    return {
        loanId,
        bookId: book.id,
        userId: loan.user_id,
        status: 'overdue'
    };
}

export async function cancelExpiredReservations() {
    const now = new Date().toISOString();
    
    const expiredReservations = await fetchAll(db, 
        `SELECT * FROM reservations WHERE status = 'active' AND expires_at < ?`,
        [now]
    );

    if (!expiredReservations || expiredReservations.length === 0) {
        return { cancelled: 0, message: 'No expired reservations found' };
    }

    let cancelledCount = 0;

    for (const reservation of expiredReservations) {
        try {
            const book = await getBookById(reservation.book_id);
            if (book && canTransition(book.status, BookEvents.CANCEL_RESERVATION)) {
                await execute(db, 
                    `UPDATE reservations SET status = 'expired', cancelled_at = ? WHERE id = ?`,
                    [now, reservation.id]
                );

                const newStatus = getNextState(book.status, BookEvents.CANCEL_RESERVATION);
                await updateBookStatus(
                    book.id, 
                    newStatus, 
                    BookEvents.CANCEL_RESERVATION, 
                    reservation.user_id, 
                    null, 
                    reservation.id, 
                    `Reservation expired automatically`
                );

                cancelledCount++;
                logger.info(`Expired reservation ${reservation.id} cancelled automatically`);
            }
        } catch (error) {
            logger.error(`Error cancelling expired reservation ${reservation.id}: ${error.message}`);
        }
    }

    return {
        cancelled: cancelledCount,
        message: `Cancelled ${cancelledCount} expired reservation(s)`
    };
}

export async function markOverdueLoans() {
    const now = new Date().toISOString();
    
    const overdueLoans = await fetchAll(db, 
        `SELECT * FROM loans WHERE status = 'active' AND due_date < ?`,
        [now]
    );

    if (!overdueLoans || overdueLoans.length === 0) {
        return { marked: 0, message: 'No overdue loans found' };
    }

    let markedCount = 0;

    for (const loan of overdueLoans) {
        try {
            await markOverdue(loan.id);
            markedCount++;
        } catch (error) {
            logger.error(`Error marking loan ${loan.id} as overdue: ${error.message}`);
        }
    }

    return {
        marked: markedCount,
        message: `Marked ${markedCount} loan(s) as overdue`
    };
}

export async function restoreInventory(bookId, userId, reason = 'inventory_restoration') {
    const book = await getBookById(bookId);
    if (!book) {
        throw new Error(`Book with id ${bookId} not found`);
    }

    if (!canTransition(book.status, BookEvents.RESTORE)) {
        throw new Error(`Cannot restore book with status ${book.status}`);
    }

    const newStatus = getNextState(book.status, BookEvents.RESTORE);
    await updateBookStatus(
        bookId, 
        newStatus, 
        BookEvents.RESTORE, 
        userId, 
        null, 
        null, 
        `Inventory restored: ${reason}`
    );

    logger.info(`Book ${bookId} inventory restored by user ${userId}, reason: ${reason}`);
    
    return {
        bookId,
        previousStatus: book.status,
        newStatus,
        restoredBy: userId,
        reason
    };
}

export async function getBookStatusHistory(bookId) {
    const sql = `
        SELECT * FROM status_history 
        WHERE book_id = ? 
        ORDER BY created_at DESC
    `;
    return await fetchAll(db, sql, [bookId]);
}

export async function getActiveLoansByUser(userId) {
    const sql = `
        SELECT loans.*, books.title, books.isbn
        FROM loans
        JOIN books ON loans.book_id = books.id
        WHERE loans.user_id = ? AND loans.status IN ('active', 'overdue')
        ORDER BY loans.created_at DESC
    `;
    return await fetchAll(db, sql, [userId]);
}

export async function getActiveReservationsByUser(userId) {
    const sql = `
        SELECT reservations.*, books.title, books.isbn
        FROM reservations
        JOIN books ON reservations.book_id = books.id
        WHERE reservations.user_id = ? AND reservations.status = 'active'
        ORDER BY reservations.created_at DESC
    `;
    return await fetchAll(db, sql, [userId]);
}
