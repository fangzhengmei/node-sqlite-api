import { body, param, query } from 'express-validator';

export const validateCreateRating = [
  body('book_id')
    .notEmpty()
    .withMessage('Book ID is required')
    .isInt({ min: 1 })
    .withMessage('Book ID must be a positive integer'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),

  body('reader_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reader name cannot exceed 100 characters'),
];

export const getRatingsByBookIdValidator = [
  param('book_id')
    .exists()
    .withMessage('Book ID is required')
    .isInt({ gt: 0 })
    .withMessage('Book ID must be a positive integer')
    .toInt(),

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
