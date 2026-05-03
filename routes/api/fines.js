import { Router } from "express";
import { 
    getAllFinesValidator, 
    getSingleFineValidator, 
    validatePayFine 
} from "../../validation/fineValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { 
    getAllFines, 
    getSingleFine, 
    payFine, 
    getOverdueFinesReminder 
} from "../../controllers/fineController.js";

export const fineRouter = Router();

fineRouter.get('/', getAllFinesValidator, validationErrorHandler, getAllFines);
fineRouter.get('/overdue-reminder', getOverdueFinesReminder);
fineRouter.get('/:id', getSingleFineValidator, validationErrorHandler, getSingleFine);
fineRouter.post('/:fine_id/pay', validatePayFine, validationErrorHandler, payFine);
