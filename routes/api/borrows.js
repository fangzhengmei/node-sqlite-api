import { Router } from "express";
import { borrowBookValidation, returnBookValidation, getBorrowRecordsValidation, getSingleBorrowRecordValidation } from "../../validation/borrowValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { borrowBook, returnBook, getAllBorrowRecords, getSingleBorrowRecord } from "../../controllers/borrowController.js";

export const borrowRouter = Router();

borrowRouter.post('/', borrowBookValidation, validationErrorHandler, borrowBook);
borrowRouter.get('/', getBorrowRecordsValidation, validationErrorHandler, getAllBorrowRecords);
borrowRouter.get('/:id', getSingleBorrowRecordValidation, validationErrorHandler, getSingleBorrowRecord);
borrowRouter.put('/:id/return', returnBookValidation, validationErrorHandler, returnBook);
