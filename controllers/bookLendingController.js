import { asyncHandler } from "../utils/asyncWrapper.js";
import * as lendingService from "../services/bookLendingService.js";
import { logger } from "../logger/logger.js";

export const reserveBook = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { userId, reservationHours } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to reserve book ${bookId} for user ${userId}`);
    
    const result = await lendingService.reserveBook(
        parseInt(bookId), 
        parseInt(userId), 
        reservationHours ? parseInt(reservationHours) : undefined
    );
    
    return res.status(200).json({
        msg: 'Book reserved successfully',
        data: result
    });
});

export const cancelReservation = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to cancel reservation ${reservationId} for user ${userId}`);
    
    const result = await lendingService.cancelReservation(
        parseInt(reservationId), 
        parseInt(userId)
    );
    
    return res.status(200).json({
        msg: 'Reservation cancelled successfully',
        data: result
    });
});

export const activateReservation = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const { userId, loanDays } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to activate reservation ${reservationId} for user ${userId}`);
    
    const result = await lendingService.activateReservation(
        parseInt(reservationId), 
        parseInt(userId),
        loanDays ? parseInt(loanDays) : undefined
    );
    
    return res.status(200).json({
        msg: 'Reservation activated successfully, book checked out',
        data: result
    });
});

export const checkoutBook = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { userId, loanDays } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to checkout book ${bookId} for user ${userId}`);
    
    const result = await lendingService.checkoutBook(
        parseInt(bookId), 
        parseInt(userId),
        loanDays ? parseInt(loanDays) : undefined
    );
    
    return res.status(200).json({
        msg: 'Book checked out successfully',
        data: result
    });
});

export const returnBook = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to return book for loan ${loanId} by user ${userId}`);
    
    const result = await lendingService.returnBook(
        parseInt(loanId), 
        parseInt(userId)
    );
    
    return res.status(200).json({
        msg: 'Book returned successfully',
        data: result
    });
});

export const cancelExpiredReservations = asyncHandler(async (req, res) => {
    logger.info('Attempting to cancel expired reservations');
    
    const result = await lendingService.cancelExpiredReservations();
    
    return res.status(200).json({
        msg: result.message,
        data: result
    });
});

export const markOverdueLoans = asyncHandler(async (req, res) => {
    logger.info('Attempting to mark overdue loans');
    
    const result = await lendingService.markOverdueLoans();
    
    return res.status(200).json({
        msg: result.message,
        data: result
    });
});

export const restoreInventory = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { userId, reason } = req.body;

    if (!userId) {
        const error = new Error("userId is required");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Attempting to restore inventory for book ${bookId} by user ${userId}`);
    
    const result = await lendingService.restoreInventory(
        parseInt(bookId), 
        parseInt(userId),
        reason
    );
    
    return res.status(200).json({
        msg: 'Inventory restored successfully',
        data: result
    });
});

export const getBookStatusHistory = asyncHandler(async (req, res) => {
    const { bookId } = req.params;

    logger.info(`Fetching status history for book ${bookId}`);
    
    const history = await lendingService.getBookStatusHistory(parseInt(bookId));
    
    if (!history || history.length === 0) {
        return res.status(204).json({
            msg: 'No status history found for this book'
        });
    }
    
    return res.status(200).json({
        msg: 'Status history retrieved successfully',
        data: history
    });
});

export const getActiveLoansByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    logger.info(`Fetching active loans for user ${userId}`);
    
    const loans = await lendingService.getActiveLoansByUser(parseInt(userId));
    
    if (!loans || loans.length === 0) {
        return res.status(204).json({
            msg: 'No active loans found for this user'
        });
    }
    
    return res.status(200).json({
        msg: 'Active loans retrieved successfully',
        data: loans
    });
});

export const getActiveReservationsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    logger.info(`Fetching active reservations for user ${userId}`);
    
    const reservations = await lendingService.getActiveReservationsByUser(parseInt(userId));
    
    if (!reservations || reservations.length === 0) {
        return res.status(204).json({
            msg: 'No active reservations found for this user'
        });
    }
    
    return res.status(200).json({
        msg: 'Active reservations retrieved successfully',
        data: reservations
    });
});
