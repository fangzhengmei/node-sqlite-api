import { Router } from "express";
import { 
    validateBorrowBook, 
    validateReturnBook, 
    getAllBorrowRecordsValidator, 
    getSingleBorrowRecordValidator 
} from "../../validation/borrowValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { 
    borrowBook, 
    returnBook, 
    getAllBorrowRecords, 
    getSingleBorrowRecord 
} from "../../controllers/borrowController.js";

export const borrowRouter = Router();

borrowRouter.post('/', validateBorrowBook, validationErrorHandler, borrowBook);
borrowRouter.get('/', getAllBorrowRecordsValidator, validationErrorHandler, getAllBorrowRecords);
borrowRouter.get('/:id', getSingleBorrowRecordValidator, validationErrorHandler, getSingleBorrowRecord);
borrowRouter.post('/:borrow_id/return', validateReturnBook, validationErrorHandler, returnBook);
