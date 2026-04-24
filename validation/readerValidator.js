import { body, query, param } from 'express-validator';

export const createReaderValidation = [
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
      .withMessage('Reader name must be greater than 2 characters'),

  body("phone")
      .optional()
      .trim()
      .escape()
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 characters'),

  body("address")
      .optional()
      .trim()
      .escape(),
]

export const getReadersValidation = [
    query("name")
        .optional()
        .trim()
        .escape()
        .isLength({min : 2})
        .withMessage('Reader name must be greater than 2 characters'),
    
    query("email")
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email address'),
    
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

    query("sort")
    .optional()
    .custom((sort)=>{
      if(!sort) return true;
      const allowedFields = ['name','email','created_at'];
      if(!allowedFields.includes(sort)){
        throw new Error('Sorting can only be done by one of the fields from : name, email or created_at')
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

export const getSingleReaderValidation = [
    param("id")
      .exists()
      .withMessage('ID is required')                                        
      .isInt({ gt: 0 })
      .withMessage('ID must be a positive integer') 
      .toInt(),
]

export const updateReaderValidation = [
  param("id")
    .exists()
    .withMessage('ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer') 
    .toInt(),

  body("name")
      .optional()
      .trim()
      .escape()
      .isLength({min : 2})
      .withMessage('Reader name must be greater than 2 characters'),

  body("email")
      .optional()
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage('Please enter a valid email address'),

  body("phone")
      .optional()
      .trim()
      .escape()
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 characters'),

  body("address")
      .optional()
      .trim()
      .escape(),
]
