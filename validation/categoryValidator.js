import { body, query, param } from 'express-validator';

export const validateCreateCategory = [
  body('name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer')
    .toInt(),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
    .toBoolean(),
];

export const validateUpdateCategory = [
  param('id')
    .exists()
    .withMessage('ID is required')
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer')
    .toInt(),

  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('parent_id')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      if (typeof value === 'number' && value > 0) return true;
      throw new Error('Parent ID must be null or a positive integer');
    }),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
    .toBoolean(),
];

export const validateGetCategory = [
  param('id')
    .exists()
    .withMessage('ID is required')
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer')
    .toInt(),
];

export const validateGetAllCategories = [
  query('name')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Name cannot be empty'),

  query('parent_id')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      if (value === null || value === undefined) return true;
      const num = parseInt(value);
      if (isNaN(num) || num <= 0) {
        throw new Error('Parent ID must be a positive integer or "null" for root categories');
      }
      return true;
    }),

  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
    .toBoolean(),

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
    .custom((sort) => {
      if (!sort) return true;
      const allowedFields = ['name', 'id', 'created_at', 'updated_at'];
      if (!allowedFields.includes(sort)) {
        throw new Error('Sorting can only be done by one of the fields from: name, id, created_at, updated_at');
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

export const validateGetBooksByCategory = [
  param('id')
    .exists()
    .withMessage('Category ID is required')
    .isInt({ gt: 0 })
    .withMessage('Category ID must be a positive integer')
    .toInt(),

  query('title')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title cannot be empty'),

  query('year')
    .optional()
    .isInt({ min: 1000, max: 9999 })
    .withMessage('Published year must be a 4-digit number representing a valid year'),

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
    .custom((sort) => {
      if (!sort) return true;
      const allowedFields = ['title', 'published_year', 'created_at'];
      if (!allowedFields.includes(sort)) {
        throw new Error('Sorting can only be done by one of the fields from: title, published_year, created_at');
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

export const validateBookCategories = [
  param('bookId')
    .exists()
    .withMessage('Book ID is required')
    .isInt({ gt: 0 })
    .withMessage('Book ID must be a positive integer')
    .toInt(),

  body('category_ids')
    .isArray()
    .withMessage('category_ids must be an array')
    .custom((arr) => {
      if (arr.length === 0) return true;
      return arr.every((id) => Number.isInteger(id) && id > 0);
    })
    .withMessage('All category IDs must be positive integers'),
];
