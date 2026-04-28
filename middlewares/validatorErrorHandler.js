import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/AppError.js';

export const validationErrorHandler = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value
        }));
        return next(new ValidationError('Validation failed', validationErrors));
    }
    next();
};