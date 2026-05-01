import { Router } from "express";
import {
    reserveBook,
    cancelReservation,
    activateReservation,
    checkoutBook,
    returnBook,
    cancelExpiredReservations,
    markOverdueLoans,
    restoreInventory,
    getBookStatusHistory,
    getActiveLoansByUser,
    getActiveReservationsByUser
} from "../../controllers/bookLendingController.js";

export const lendingRouter = Router();

lendingRouter.post('/books/:bookId/reserve', reserveBook);

lendingRouter.post('/reservations/:reservationId/cancel', cancelReservation);

lendingRouter.post('/reservations/:reservationId/activate', activateReservation);

lendingRouter.post('/books/:bookId/checkout', checkoutBook);

lendingRouter.post('/loans/:loanId/return', returnBook);

lendingRouter.post('/jobs/cancel-expired-reservations', cancelExpiredReservations);

lendingRouter.post('/jobs/mark-overdue-loans', markOverdueLoans);

lendingRouter.post('/books/:bookId/restore', restoreInventory);

lendingRouter.get('/books/:bookId/history', getBookStatusHistory);

lendingRouter.get('/users/:userId/loans', getActiveLoansByUser);

lendingRouter.get('/users/:userId/reservations', getActiveReservationsByUser);
