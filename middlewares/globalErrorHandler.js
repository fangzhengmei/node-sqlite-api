import { logger } from '../logger/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    const statusCode = err.statusCode || 500;
    const response = {
        status: 'error',
        message: err.message || 'Something went wrong'
    };

    if (err.errors && Array.isArray(err.errors)) {
        response.errors = err.errors;
    }

    return res.status(statusCode).json(response);
};