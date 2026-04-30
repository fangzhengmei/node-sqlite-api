import { body, query, param } from 'express-validator';

export const borrowBookValidation = [
  body("reader_id")
      .notEmpty()
      .isInt({ min: 1 })
      .withMessage('Reader ID must be a positive integer'),
  
  body("book_id")
      .notEmpty()
      .isInt({ min: 1 })
      .withMessage('Book ID must be a positive integer'),

  body("borrow_days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Borrow days must be between 1 and 365')
]

export const returnBookValidation = [
  param("id")
    .exists()
    .withMessage('Borrow record ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('Borrow record ID must be a positive integer') 
    .toInt(),
]

export const getBorrowRecordsValidation = [
    query("reader_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage('Reader ID must be a positive integer'),
    
    query("book_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage('Book ID must be a positive integer'),
    
    query("status")
        .optional()
        .trim()
        .escape()
        .custom((status) => {
          const allowedStatuses = ['borrowed', 'returned', 'overdue'];
          if (!allowedStatuses.includes(status.toLowerCase())) {
            throw new Error('Status must be one of: borrowed, returned, overdue');
          }
          return true;
        }),

  query('page')
    .optional()
    .trim()
    .isInt({gt : 0})
    .withMessage('Page number must be greater than 0')
    .toInt(),
  
  query('limit')
    .optional()
    .trim()
    .isInt({git : 0})
    .withMessage('Limit  must be greater than 0')
    .toInt()
]

export const getSingleBorrowRecordValidation = [
    param("id")
      .exists()
      .withMessage('Borrow record ID is required')                                        
      .isInt({ gt: 0 })
      .withMessage('Borrow record ID must be a positive integer') 
      .toInt(),
]
