import { Router } from "express";
import { getBorrowsValidation, getSingleBorrowValidation, createBorrowValidation, returnBorrowValidation } from "../../validation/borrowValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { borrowBook, returnBook, getAllBorrowRecords, getSingleBorrowRecord, updateOverdueStatuses } from "../../controllers/borrowController.js";

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
 *     summary: Get list of all borrow records with reader and book details
 *     description: retrieve a list of borrow records with optional filtering by different categories
 *     tags: [Borrows]
 *     parameters: 
 *       - in: query
 *         name: reader_id
 *         schema: 
 *           type: integer
 *         description: Filter borrow records by reader ID
 *       - in: query
 *         name: book_id
 *         schema: 
 *           type: integer
 *         description: Filter borrow records by book ID
 *       - in: query
 *         name: status
 *         schema: 
 *           type: string
 *           enum: [borrowed, returned, overdue]
 *         description: Filter borrow records by status
 *       - in: query
 *         name: order
 *         schema: 
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort records in ascending or descending order
 *       - in: query
 *         name: sort
 *         schema: 
 *           type: string
 *           enum: [borrow_date, due_date, return_date, status, created_at]
 *         description: Sort records by different options like borrow_date, due_date, status etc.
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
 *         content: 
 *           application/json:
 *             schema: 
 *               type: object
 *               properties: 
 *                 msg: 
 *                   type: string
 *                   example: Borrow records retrieved successfully
 *                 data: 
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties: 
 *                       id: 
 *                         type: integer
 *                       reader_id: 
 *                         type: integer
 *                       reader_name: 
 *                         type: string
 *                       reader_email: 
 *                          type: string
 *                       book_id: 
 *                         type: integer
 *                       book_title: 
 *                         type: string
 *                       book_isbn:
 *                         type: string
 *                       borrow_date:
 *                         type: string
 *                       due_date:
 *                         type: string
 *                       return_date:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [borrowed, returned, overdue]
 *                       created_at:    
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties: 
 *                     page: 
 *                       type: integer
 *                       example: 1
 *                     limit: 
 *                       type: integer 
 *                       example: 10
 *                     count:     
 *                       type: integer
 *                       example: 2
 *       204: 
 *         description: No borrow records found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No any borrow records in the list yet"
 * 
 *   post:
 *     summary: Borrow a book
 *     description: Create a new borrow record for a reader. A reader can borrow maximum 5 books at a time.
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
 *                 description: ID of the reader borrowing the book
 *               book_id: 
 *                 type: integer
 *                 example: 1
 *                 description: ID of the book to be borrowed
 *               due_date:
 *                  type: string
 *                  format: date-time
 *                  example: 2025-10-15T00:00:00Z
 *                  description: The date by which the book should be returned
 *     responses: 
 *       200: 
 *         description: Book borrowed successfully
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Book borrowed successfully
 *       400: 
 *         description: Invalid reader/book, book already borrowed, or max borrow limit reached
 *         content:
 *           application/json:
 *             examples:
 *               invalidReader:
 *                 value:
 *                   msg: "No such reader with id 99 exists"
 *               invalidBook:
 *                 value:
 *                   msg: "No such book with id 99 exists"
 *               bookAlreadyBorrowed:
 *                 value:
 *                   msg: "This book is currently borrowed by another reader"
 *               maxLimitReached:
 *                 value:
 *                   msg: "Reader has reached the maximum borrow limit of 5 books"
 */

/**
 * @swagger
 * /borrows/{id}:
 *   get:
 *     summary: Get a single borrow record by ID
 *     description: Retrieve a single borrow record with reader and book details from the database.
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
 *         content:
 *           application/json:
 *             example:
 *               msg: Borrow record retrieved successfully
 *               data:
 *                 id: 1
 *                 borrow_date: "2025-09-12T06:47:02Z"
 *                 due_date: "2025-10-12T06:47:02Z"
 *                 return_date: null
 *                 status: "borrowed"
 *                 created_at: "2025-09-12T06:47:02Z"
 *                 updated_at: "2025-09-12T06:47:02Z"
 *                 reader:
 *                   id: 1
 *                   name: "张三"
 *                   email: "zhangsan@example.com"
 *                   phone: "13800138001"
 *                 book:
 *                   id: 1
 *                   title: "Harry Potter"
 *                   isbn: "1234567890"
 *                   published_year: 1997
 *       404:
 *         description: Borrow record not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "Borrow record with the given id 99 does not exist"
 */

/**
 * @swagger
 * /borrows/{id}/return:
 *   put:
 *     summary: Return a book
 *     description: Mark a borrowed book as returned. If returned after due date, status will be marked as 'overdue'.
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
 *         content:
 *           application/json:
 *             examples:
 *               returnedOnTime:
 *                 value:
 *                   msg: "Book returned successfully"
 *                   status: "returned"
 *               returnedOverdue:
 *                 value:
 *                   msg: "Book returned successfully"
 *                   status: "overdue"
 *       404:
 *         description: Borrow record not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No such borrow record with id 99 exists"
 *       400:
 *         description: Book already returned
 *         content:
 *           application/json:
 *             example:
 *               msg: "This book has already been returned"
 */

/**
 * @swagger
 * /borrows/update-overdue:
 *   post:
 *     summary: Update overdue statuses
 *     description: Batch update all overdue borrow records status from 'borrowed' to 'overdue'. Can be called by a scheduled job.
 *     tags: [Borrows]
 *     responses:
 *       200:
 *         description: Overdue statuses updated successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: "Overdue statuses updated successfully"
 */

borrowRouter.post('/', createBorrowValidation, validationErrorHandler, borrowBook);
borrowRouter.get('/', getBorrowsValidation, validationErrorHandler, getAllBorrowRecords);
borrowRouter.get('/:id', getSingleBorrowValidation, validationErrorHandler, getSingleBorrowRecord);
borrowRouter.put('/:id/return', returnBorrowValidation, validationErrorHandler, returnBook);
borrowRouter.post('/update-overdue', updateOverdueStatuses);
