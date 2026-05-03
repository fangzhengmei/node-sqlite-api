import { body, query, param } from 'express-validator';

export const getAllFinesValidator = [
    query('borrower_name')
        .optional()
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Borrower name cannot be empty'),

    query('is_paid')
        .optional()
        .custom((isPaid) => {
            if (isPaid === undefined || isPaid === null || isPaid === '') return true;
            const allowedValues = ['true', 'false', '1', '0'];
            if (!allowedValues.includes(isPaid)) {
                throw new Error('is_paid must be true, false, 1, or 0');
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

export const getSingleFineValidator = [
    param('id')
        .exists()
        .withMessage('ID is required')
        .isInt({ gt: 0 })
        .withMessage('ID must be a positive integer')
        .toInt(),
];

export const validatePayFine = [
    param('fine_id')
        .exists()
        .withMessage('Fine ID is required')
        .isInt({ gt: 0 })
        .withMessage('Fine ID must be a positive integer')
        .toInt(),

    body('paid_date')
        .optional()
        .isDate()
        .withMessage('Paid date must be a valid date format (YYYY-MM-DD)'),
];
