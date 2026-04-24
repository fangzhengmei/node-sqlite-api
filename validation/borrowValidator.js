import { body, query, param } from 'express-validator';

export const createBorrowValidation = [
  body('reader_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Reader ID must be a positive integer'),

  body('book_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Book ID must be a positive integer'),

  body('due_date')
    .notEmpty()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date format'),
];

export const getBorrowsValidation = [
  query('reader_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Reader ID must be a positive integer')
    .toInt(),

  query('book_id')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Book ID must be a positive integer')
    .toInt(),

  query('status')
    .optional()
    .custom((status)=>{
      if(!status) return true;
      const allowedStatuses = ['borrowed','returned','overdue'];
      if(!allowedStatuses.includes(status)){
        throw new Error('Status must be one of: borrowed, returned, overdue')
      }
      return true;
    }),

  query('order')
    .optional()
    .custom((order) => {
      if (!order) return true;
      const allowedOrders = ['ASC', 'DESC'];
      if (!allowedOrders.includes(order.toUpperCase())) {
        throw new Error('Order must be either ASC or DESC');
      }
      return true;
    }),
  
  query('sort')
    .optional()
    .custom((sort)=>{
      if(!sort) return true;
      const allowedFields = ['borrow_date','due_date','return_date','status','created_at'];
      if(!allowedFields.includes(sort)){
        throw new Error('Sorting can only be done by one of the fields from : borrow_date, due_date, return_date, status or created_at')
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
    .withMessage('Limit must be greater than 0')
    .toInt()
]

export const getSingleBorrowValidation = [
  param("id")
    .exists()
    .withMessage('Borrow record ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('Borrow record ID must be a positive integer') 
    .toInt(),
]

export const returnBorrowValidation = [
  param("id")
    .exists()
    .withMessage('Borrow record ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('Borrow record ID must be a positive integer') 
    .toInt(),
]
