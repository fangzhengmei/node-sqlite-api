export const asyncHandler = fn => (req, res, next) => {
    return fn(req, res, next).catch(err => {
        if (next) {
            next(err);
        } else {
            throw err;
        }
    });
}