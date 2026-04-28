import { Router } from "express";
import { getAllBooksValidator, getSingleBookValidator, updateBooksValidator, validateCreateBook } from "../../validation/bookValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { checkIsbnDuplicate, checkAuthorExists, checkBookExists, checkAtLeastOneField } from "../../middlewares/businessValidators.js";
import { createBooks, getAllBooks, getSingleBook, updateBooks } from "../../controllers/booksController.js";

export const bookRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Endpoints for managing books
 */

/**
 * @swagger
 * /books:
 *   get:
 *     summary: Get list of all books along with their author's name
 *     description: retrieve a list of books along with thier author names with optional filtering by different categories
 *     tags: [Books]
 *     parameters: 
 *       - in: query
 *         name: title
 *         schema: 
 *           type: string
 *         description: Filter books by title
 *       - in: query
 *         name: year
 *         schema: 
 *           type: integer
 *         description: Filter books by year
 *       - in: query
 *         name: order
 *         schema: 
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort books by different options like published_year, created_at , title in ascending or descending order
 *       - in: query
 *         name: sort
 *         schema: 
 *           type: string
 *           enum: [title, published_year, created_at]
 *         description: Sort books by title, published_year or created_at in ascending or descending order
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
 *         description: List of books retrieved successfully
 *         content: 
 *           application/json:
 *             schema: 
 *               type: object
 *               properties: 
 *                 msg: 
 *                   type: string
 *                   example: Books retrieved successfully
 *                 data: 
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties: 
 *                       id: 
 *                         type: integer
 *                       title: 
 *                         type: string
 *                       isbn: 
 *                          type : string
 *                       published_year: 
 *                         type: integer
 *                       author_id: 
 *                         type: integer,
 *                       created_at:    
 *                         type: string
 *                       author:
 *                          type: string
 *       204: 
 *         description: No books found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No any books in the list yet"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Validation failed"
 *               errors:
 *                 - field: "year"
 *                   message: "Published year must be a 4-digit number representing a valid year"
 *                   value: "invalid"
 *                 - field: "page"
 *                   message: "Page number must be greater than 0"
 *                   value: -1
 * 
 *   post:
 *     summary: Create a new book
 *     description: Add a new book into the database
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - isbn
 *               - published_year
 *               - author_id
 *             properties: 
 *               title:
 *                 type: string
 *                 example: book1
 *               isbn: 
 *                 type: string
 *                 example: 1234567890
 *                 description : must be a 10 digits unique string
 *               published_year:
 *                  type: integer
 *                  example: 1996
 *               author_id:
 *                  type: integer
 *                  example: 1
 *               created_at: 
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-14T06:47:02Z"
 *                 description: Optional.
 *     responses: 
 *       200: 
 *         description: Bok created successfully
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Book created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Validation failed"
 *               errors:
 *                 - field: "title"
 *                   message: "Title is required"
 *                   value: ""
 *                 - field: "isbn"
 *                   message: "ISBN must be exactly 10 digits"
 *                   value: "123"
 *                 - field: "published_year"
 *                   message: "Published year must be a 4-digit number representing a valid year"
 *                   value: 500
 *                 - field: "author_id"
 *                   message: "Author ID must be a positive integer"
 *                   value: -1
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Author with id 99 not found"
 *       409: 
 *         description: Duplicate ISBN
 *         content: 
 *           application/json:
 *             example: 
 *               status: "error"
 *               message: "Book with this ISBN already exists"
 */

/**
 * @swagger
 * /books/{id}:
 *   get:
 *     summary: Get a single book by ID
 *     description: Retrieve a single book and their associated author details from the database.
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the book
 *     responses:
 *       200:
 *         description: Book retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Book retrieved successfully
 *               data:
 *                 author_id: 1
 *                 name: "J.K. Rowling"
 *                 email: "jk.rowling@gmail.com"
 *                 author_created_at: "2025-09-12T06:47:02Z"
 *                 books_id: 1
 *                 title: Game Of Thrones
 *                 isbn: 1234567890
 *                 published_year: 2026
 *                 book_created_at: "2025-09-12T06:47:02Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Validation failed"
 *               errors:
 *                 - field: "id"
 *                   message: "ID must be a positive integer"
 *                   value: "abc"
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Book with id 99 not found"
 *   put:
 *     summary: Update a book by ID
 *     description: Update one or more fields of a book in the database. At least one field must be provided.
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the book to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "New Book Title"
 *                 description: The new title of the book
 *               isbn:
 *                 type: string
 *                 example: "1234567890"
 *                 description: The ISBN number (must be unique)
 *               published_year:
 *                 type: integer
 *                 example: 2025
 *                 description: Year the book was published
 *               author_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the author
 *             minProperties: 1
 *             description: At least one field is required for update
 *     responses:
 *       200:
 *         description: Book updated successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: "Book updated successfully"
 *       400:
 *         description: Validation error or no fields provided
 *         content:
 *           application/json:
 *             examples:
 *               validationError:
 *                 summary: Input validation failed
 *                 value:
 *                   status: "error"
 *                   message: "Validation failed"
 *                   errors:
 *                     - field: "id"
 *                       message: "ID must be a positive integer"
 *                       value: "abc"
 *                     - field: "isbn"
 *                       message: "ISBN must be exactly 10 digits"
 *                       value: "123"
 *               noFieldsProvided:
 *                 summary: No fields provided for update
 *                 value:
 *                   status: "error"
 *                   message: "At least one field must be provided to update"
 *       404:
 *         description: Book or author not found
 *         content:
 *           application/json:
 *             examples:
 *               bookNotFound:
 *                 summary: Book not found
 *                 value:
 *                   status: "error"
 *                   message: "Book with id 99 not found"
 *               authorNotFound:
 *                 summary: Author not found
 *                 value:
 *                   status: "error"
 *                   message: "Author with id 99 not found"
 *       409:
 *         description: Duplicate ISBN
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Book with this ISBN already exists"
 */

bookRouter.post('/', validateCreateBook, validationErrorHandler, checkIsbnDuplicate, checkAuthorExists, createBooks);
bookRouter.get('/' , getAllBooksValidator, validationErrorHandler, getAllBooks);
bookRouter.get('/:id' , getSingleBookValidator, validationErrorHandler, checkBookExists, getSingleBook);
bookRouter.put('/:id' , updateBooksValidator, validationErrorHandler, checkBookExists, checkAtLeastOneField, checkIsbnDuplicate, checkAuthorExists, updateBooks);
