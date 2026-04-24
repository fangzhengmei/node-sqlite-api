import { Router } from "express";
import { getAllBorrowRecordsValidator, getSingleBorrowRecordValidator, validateBorrowBook, validateReturnBook } from "../../validation/borrowValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { borrowBook, returnBook, getAllBorrowRecords, getSingleBorrowRecord } from "../../controllers/borrowController.js";

export const borrowRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Borrows
 *   description: Endpoints for managing book borrowings
 */

/**
 * @swagger
 * /borrows:
 *   get:
 *     summary: Get list of all borrow records
 *     description: retrieve a list of borrow records with optional filtering and pagination
 *     tags: [Borrows]
 *     parameters: 
 *       - in: query
 *         name: reader_id
 *         schema: 
 *           type: integer
 *         description: Filter by reader ID
 *       - in: query
 *         name: book_id
 *         schema: 
 *           type: integer
 *         description: Filter by book ID
 *       - in: query
 *         name: status
 *         schema: 
 *           type: string
 *           enum: [borrowed, returned, overdue]
 *         description: Filter by borrow status
 *       - in: query
 *         name: order
 *         schema: 
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *       - in: query
 *         name: sort
 *         schema: 
 *           type: string
 *           enum: [borrow_date, due_date, return_date, status, created_at]
 *         description: Sort records by field
 *       - in: query
 *         name: page
 *         schema: 
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: 
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses: 
 *       200:
 *         description: List of borrow records retrieved successfully
 *       204: 
 *         description: No borrow records found
 * 
 *   post:
 *     summary: Borrow a book
 *     description: Create a new borrow record for a reader
 *     tags: [Borrows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reader_id
 *               - book_id
 *               - due_date
 *             properties: 
 *               reader_id:
 *                 type: integer
 *                 example: 1
 *               book_id: 
 *                 type: integer
 *                 example: 1
 *               due_date:
 *                  type: string
 *                  format: date-time
 *                  example: 2025-01-15T00:00:00Z
 *     responses: 
 *       200: 
 *         description: Book borrowed successfully
 *       400: 
 *         description: Invalid reader/book, book already borrowed, or max borrow limit reached
 */

/**
 * @swagger
 * /borrows/{id}:
 *   get:
 *     summary: Get a single borrow record by ID
 *     description: Retrieve a single borrow record with reader and book details
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the borrow record
 *     responses:
 *       200:
 *         description: Borrow record retrieved successfully
 *       404:
 *         description: Borrow record not found
 */

/**
 * @swagger
 * /borrows/{id}/return:
 *   put:
 *     summary: Return a book
 *     description: Mark a borrowed book as returned
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the borrow record
 *     responses:
 *       200:
 *         description: Book returned successfully
 *       404:
 *         description: Borrow record not found
 *       400:
 *         description: Book already returned
 */

borrowRouter.post('/', validateBorrowBook, validationErrorHandler, borrowBook);
borrowRouter.get('/', getAllBorrowRecordsValidator, validationErrorHandler, getAllBorrowRecords);
borrowRouter.get('/:id', getSingleBorrowRecordValidator, validationErrorHandler, getSingleBorrowRecord);
borrowRouter.put('/:id/return', validateReturnBook, validationErrorHandler, returnBook);
