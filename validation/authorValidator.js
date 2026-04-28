import { body, query, param } from 'express-validator';

export const createAuthorValidation = [
  body("email")
      .trim()
      .normalizeEmail()
      .notEmpty()
      .isEmail()
      .withMessage('Please enter a valid email address'),
  
  body("name")
      .trim()
      .escape()
      .isLength({min : 2})
      .withMessage('Author name must be greater than 2 characters')
]

export const getAuthorValidation = [
    query("name")
        .optional()
        .trim()
        .escape()
        .isLength({min : 2})
        .withMessage('Author name must be greater than 2 characters'),
    
    query("order")
    .optional()
    .custom((order) => {
      if (!order) return true;
      const allowedOrders = ['ASC', 'DESC'];
      if (!allowedOrders.includes(order.toUpperCase())) {
        throw new Error('Order must be either ASC or DESC');
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
    .isInt({gt : 0})
    .withMessage('Limit must be greater than 0')
    .toInt()
]

export const getSingleAuthorValidation = [
    param("authorId")
      .exists()
      .withMessage('ID is required')                                        
      .isInt({ gt: 0 })
      .withMessage('ID must be a positive integer') 
      .toInt(),
]