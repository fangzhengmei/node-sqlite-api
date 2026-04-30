import { Router } from "express";
import { createReaderValidation, getReaderValidation, getSingleReaderValidation, updateReaderValidation } from "../../validation/readerValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { createReader, getAllReaders, getSingleReader, updateReader } from "../../controllers/readerController.js";

export const readerRouter = Router();

readerRouter.post('/', createReaderValidation, validationErrorHandler , createReader);
readerRouter.get('/', getReaderValidation, validationErrorHandler , getAllReaders);
readerRouter.get('/:id', getSingleReaderValidation, validationErrorHandler , getSingleReader);
readerRouter.put('/:id', updateReaderValidation, validationErrorHandler , updateReader);
