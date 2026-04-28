import { validationErrorHandler } from '../../middlewares/validatorErrorHandler.js';
import { ValidationError } from '../../errors/AppError.js';

jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

import { validationResult } from 'express-validator';

describe('validatorErrorHandler', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {};
        res = {};
        next = jest.fn();
    });

    test('should call next() without error when validation passes', () => {
        validationResult.mockReturnValue({
            isEmpty: () => true
        });

        validationErrorHandler(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    test('should pass ValidationError with v7 path property mapped to field when validation fails', () => {
        const v7Errors = [
            {
                type: 'field',
                path: 'title',
                location: 'body',
                msg: 'Title is required',
                value: ''
            },
            {
                type: 'field',
                path: 'isbn',
                location: 'body',
                msg: 'ISBN must be exactly 10 digits',
                value: '123'
            }
        ];

        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => v7Errors
        });

        validationErrorHandler(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        
        const passedError = next.mock.calls[0][0];
        expect(passedError.message).toBe('Validation failed');
        expect(passedError.errors).toHaveLength(2);
        
        expect(passedError.errors[0]).toEqual({
            field: 'title',
            message: 'Title is required',
            value: ''
        });
        
        expect(passedError.errors[1]).toEqual({
            field: 'isbn',
            message: 'ISBN must be exactly 10 digits',
            value: '123'
        });
    });

    test('should handle v7 nested path properties correctly', () => {
        const v7Errors = [
            {
                type: 'field',
                path: 'author.id',
                location: 'body',
                msg: 'Author ID must be a positive integer',
                value: -1
            }
        ];

        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => v7Errors
        });

        validationErrorHandler(req, res, next);

        const passedError = next.mock.calls[0][0];
        expect(passedError.errors[0].field).toBe('author.id');
    });

    test('should handle param validation errors (path from params)', () => {
        const v7Errors = [
            {
                type: 'field',
                path: 'id',
                location: 'params',
                msg: 'ID must be a positive integer',
                value: 'abc'
            }
        ];

        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => v7Errors
        });

        validationErrorHandler(req, res, next);

        const passedError = next.mock.calls[0][0];
        expect(passedError.errors[0]).toEqual({
            field: 'id',
            message: 'ID must be a positive integer',
            value: 'abc'
        });
    });

    test('should handle query validation errors', () => {
        const v7Errors = [
            {
                type: 'field',
                path: 'page',
                location: 'query',
                msg: 'Page number must be greater than 0',
                value: 0
            }
        ];

        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => v7Errors
        });

        validationErrorHandler(req, res, next);

        const passedError = next.mock.calls[0][0];
        expect(passedError.errors[0].field).toBe('page');
    });
});
