import { body, query, param } from 'express-validator';

export const createReservationValidation = [
  body("reader_id")
      .notEmpty()
      .isInt({ min: 1 })
      .withMessage('Reader ID must be a positive integer'),
  
  body("book_id")
      .notEmpty()
      .isInt({ min: 1 })
      .withMessage('Book ID must be a positive integer'),

  body("expire_hours")
      .optional()
      .isInt({ min: 1, max: 720 })
      .withMessage('Expire hours must be between 1 and 720 (30 days)')
]

export const cancelReservationValidation = [
  param("id")
    .exists()
    .withMessage('Reservation ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('Reservation ID must be a positive integer') 
    .toInt(),
]

export const getReservationsValidation = [
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
          const allowedStatuses = ['pending', 'notified', 'cancelled', 'expired', 'fulfilled'];
          if (!allowedStatuses.includes(status.toLowerCase())) {
            throw new Error('Status must be one of: pending, notified, cancelled, expired, fulfilled');
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

export const getSingleReservationValidation = [
    param("id")
      .exists()
      .withMessage('Reservation ID is required')                                        
      .isInt({ gt: 0 })
      .withMessage('Reservation ID must be a positive integer') 
      .toInt(),
]
