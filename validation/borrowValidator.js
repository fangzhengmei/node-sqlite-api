import { body, query, param } from 'express-validator';

export const validateBorrowBook = [
    body('book_id')
        .notEmpty()
        .withMessage('Book ID is required')
        .isInt({ min: 1 })
        .withMessage('Book ID must be a positive integer'),

    body('borrower_name')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Borrower name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Borrower name must be between 2 and 100 characters'),

    body('loan_days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Loan days must be between 1 and 365')
        .toInt(),
];

export const validateReturnBook = [
    param('borrow_id')
        .exists()
        .withMessage('Borrow ID is required')
        .isInt({ gt: 0 })
        .withMessage('Borrow ID must be a positive integer')
        .toInt(),

    body('return_date')
        .optional()
        .isDate()
        .withMessage('Return date must be a valid date format (YYYY-MM-DD)'),
];

export const getAllBorrowRecordsValidator = [
    query('borrower_name')
        .optional()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Borrower name cannot be empty'),

    query('status')
        .optional()
        .custom((status) => {
            if (!status) return true;
            const allowedStatus = ['borrowed', 'returned', 'overdue'];
            if (!allowedStatus.includes(status)) {
                throw new Error('Status must be one of: borrowed, returned, overdue');
            }
            return true;
        }),

    query('page')
        .optional()
        .trim()
        .isInt({ gt: 0 })
        .withMessage('Page number must be greater than 0')
        .toInt(),

    query('limit')
        .optional()
        .trim()
        .isInt({ gt: 0 })
        .withMessage('Limit must be greater than 0')
        .toInt(),
];

export const getSingleBorrowRecordValidator = [
    param('id')
        .exists()
        .withMessage('ID is required')
        .isInt({ gt: 0 })
        .withMessage('ID must be a positive integer')
        .toInt(),
];
