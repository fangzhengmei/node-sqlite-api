import { body, query, param } from 'express-validator';

export const validateCreateBook = [
  body('title')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required'),

  body('isbn')
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .withMessage('ISBN must be exactly 10 digits')
    .matches(/^\d{10}$/)
    .withMessage('ISBN must contain only digits'),

  body('published_year')
    .isInt({ min: 1000, max: 9999 })
    .withMessage('Published year must be a 4-digit number representing a valid year'),

  body('author_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Author ID must be a positive integer'),
];

export const getAllBooksValidator = [
  query('title')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required'),
  
  query('year')
    .optional()
    .isInt({ min: 1000, max: 9999 })
    .withMessage('Published year must be a 4-digit number representing a valid year'),
  
  query('order')
    .optional()
    //custom always runs even with .optional()
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
      const allowedFields = ['title','published_year','created_at'];
      if(!allowedFields.includes(sort)){
        throw new Error('Sorting can only be done by one of the fields from : title, published_year or created_at')
      }
      return true;
    }),

  query('author')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Author name is required'),

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

export const getSingleBookValidator = [
  param("id")
    .exists()
    .withMessage('ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer') 
    .toInt(),
]

export const updateBooksValidator = [
  param('id')
    .exists()
    .withMessage('ID is required')                                        
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer') 
    .toInt(),

  body('title')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required'),
  
  body('isbn')
    .optional()
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .withMessage('ISBN must be exactly 10 digits')
    .matches(/^\d{10}$/)
    .withMessage('ISBN must contain only digits'),

  body('published_year')
    .optional()
    .isInt({ min: 1000, max: 9999 })
    .withMessage('Published year must be a 4-digit number representing a valid year'),

  body('author_id')
    .optional()
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Author ID must be a positive integer'),
]
