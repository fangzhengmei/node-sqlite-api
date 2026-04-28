import { body, validationResult } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validatorErrorHandler.js';
import { globalErrorHandler } from '../../middlewares/globalErrorHandler.js';
import { ValidationError } from '../../errors/AppError.js';

describe('Validation Error Response Integration', () => {
    let req;
    let res;
    let next;
    let jsonSpy;
    let statusSpy;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            params: {}
        };
        
        jsonSpy = jest.fn();
        statusSpy = jest.fn().mockReturnThis();
        
        res = {
            status: statusSpy,
            json: jsonSpy
        };
        
        next = jest.fn();
    });

    describe('Complete validation flow with express-validator v7', () => {
        test('should produce error response with correct field names for body validation', async () => {
            req.body = {
                title: '',
                isbn: '123',
                published_year: 'invalid',
                author_id: -1
            };

            const validationChain = [
                body('title')
                    .trim()
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
                    .withMessage('Published year must be a 4-digit number'),
                body('author_id')
                    .notEmpty()
                    .isInt({ min: 1 })
                    .withMessage('Author ID must be a positive integer')
            ];

            for (const middleware of validationChain) {
                await new Promise(resolve => middleware(req, res, resolve));
            }

            validationErrorHandler(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            const validationError = next.mock.calls[0][0];

            expect(validationError.message).toBe('Validation failed');
            expect(Array.isArray(validationError.errors)).toBe(true);

            const fields = validationError.errors.map(e => e.field);
            expect(fields).toContain('title');
            expect(fields).toContain('isbn');
            expect(fields).toContain('published_year');
            expect(fields).toContain('author_id');

            const titleError = validationError.errors.find(e => e.field === 'title');
            expect(titleError).toBeDefined();
            expect(titleError.message).toBe('Title is required');

            const isbnError = validationError.errors.find(e => e.field === 'isbn');
            expect(isbnError).toBeDefined();
            expect(isbnError.value).toBe('123');
        });

        test('should produce error response with correct field names for param validation', async () => {
            req.params = { id: 'abc' };

            const { param } = await import('express-validator');
            const validationChain = [
                param('id')
                    .isInt({ gt: 0 })
                    .withMessage('ID must be a positive integer')
            ];

            for (const middleware of validationChain) {
                await new Promise(resolve => middleware(req, res, resolve));
            }

            validationErrorHandler(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            const validationError = next.mock.calls[0][0];

            const fields = validationError.errors.map(e => e.field);
            expect(fields).toContain('id');

            const idError = validationError.errors.find(e => e.field === 'id');
            expect(idError).toBeDefined();
            expect(idError.message).toBe('ID must be a positive integer');
            expect(idError.value).toBe('abc');
        });

        test('should produce error response with correct field names for query validation', async () => {
            req.query = { page: '0', limit: 'invalid' };

            const { query } = await import('express-validator');
            const validationChain = [
                query('page')
                    .optional()
                    .isInt({ gt: 0 })
                    .withMessage('Page number must be greater than 0'),
                query('limit')
                    .optional()
                    .isInt({ gt: 0 })
                    .withMessage('Limit must be greater than 0')
            ];

            for (const middleware of validationChain) {
                await new Promise(resolve => middleware(req, res, resolve));
            }

            validationErrorHandler(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            const validationError = next.mock.calls[0][0];

            const fields = validationError.errors.map(e => e.field);
            expect(fields).toContain('page');
            expect(fields).toContain('limit');
        });
    });

    describe('Global Error Handler Response Format', () => {
        test('should format validation errors with unified response structure', () => {
            const validationError = new ValidationError('Validation failed', [
                {
                    field: 'title',
                    message: 'Title is required',
                    value: ''
                },
                {
                    field: 'isbn',
                    message: 'ISBN must be exactly 10 digits',
                    value: '123'
                }
            ]);

            globalErrorHandler(validationError, req, res, next);

            expect(statusSpy).toHaveBeenCalledWith(400);
            expect(jsonSpy).toHaveBeenCalledWith({
                status: 'error',
                message: 'Validation failed',
                errors: [
                    {
                        field: 'title',
                        message: 'Title is required',
                        value: ''
                    },
                    {
                        field: 'isbn',
                        message: 'ISBN must be exactly 10 digits',
                        value: '123'
                    }
                ]
            });
        });

        test('should format NotFoundError with unified response structure', () => {
            const { NotFoundError } = await import('../../errors/AppError.js');
            const notFoundError = new NotFoundError('Book with id 99 not found');

            globalErrorHandler(notFoundError, req, res, next);

            expect(statusSpy).toHaveBeenCalledWith(404);
            expect(jsonSpy).toHaveBeenCalledWith({
                status: 'error',
                message: 'Book with id 99 not found'
            });
        });

        test('should format ConflictError with unified response structure', () => {
            const { ConflictError } = await import('../../errors/AppError.js');
            const conflictError = new ConflictError('Book with this ISBN already exists');

            globalErrorHandler(conflictError, req, res, next);

            expect(statusSpy).toHaveBeenCalledWith(409);
            expect(jsonSpy).toHaveBeenCalledWith({
                status: 'error',
                message: 'Book with this ISBN already exists'
            });
        });
    });

    describe('Full request-response flow', () => {
        test('complete flow: invalid request -> validation -> error response', async () => {
            req.body = {
                name: 'A',
                email: 'invalid-email'
            };

            const { body } = await import('express-validator');
            const authorValidationChain = [
                body('email')
                    .trim()
                    .normalizeEmail()
                    .notEmpty()
                    .isEmail()
                    .withMessage('Please enter a valid email address'),
                body('name')
                    .trim()
                    .escape()
                    .isLength({ min: 2 })
                    .withMessage('Author name must be greater than 2 characters')
            ];

            for (const middleware of authorValidationChain) {
                await new Promise(resolve => middleware(req, res, resolve));
            }

            validationErrorHandler(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            const validationError = next.mock.calls[0][0];

            globalErrorHandler(validationError, req, res, next);

            expect(statusSpy).toHaveBeenCalledWith(400);

            const response = jsonSpy.mock.calls[0][0];
            expect(response.status).toBe('error');
            expect(response.message).toBe('Validation failed');
            expect(Array.isArray(response.errors)).toBe(true);

            const fields = response.errors.map(e => e.field);
            expect(fields).toContain('email');
            expect(fields).toContain('name');

            const emailError = response.errors.find(e => e.field === 'email');
            expect(emailError.message).toBe('Please enter a valid email address');

            const nameError = response.errors.find(e => e.field === 'name');
            expect(nameError.message).toBe('Author name must be greater than 2 characters');
        });
    });
});
