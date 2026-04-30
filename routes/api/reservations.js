import { Router } from "express";
import { createReservationValidation, cancelReservationValidation, getReservationsValidation, getSingleReservationValidation } from "../../validation/reservationValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { createReservation, cancelReservation, getAllReservations, getSingleReservation, checkExpiredReservations } from "../../controllers/reservationController.js";

export const reservationRouter = Router();

reservationRouter.post('/', createReservationValidation, validationErrorHandler, createReservation);
reservationRouter.get('/', getReservationsValidation, validationErrorHandler, getAllReservations);
reservationRouter.get('/check-expired', checkExpiredReservations);
reservationRouter.get('/:id', getSingleReservationValidation, validationErrorHandler, getSingleReservation);
reservationRouter.put('/:id/cancel', cancelReservationValidation, validationErrorHandler, cancelReservation);
