import { Router } from "express";
import { createAuthorValidation, getAuthorValidation, getSingleAuthorValidation } from "../../validation/authorValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { authenticateToken } from "../../middlewares/authMiddleware.js";
import { createAuthor, getAllAuthors, getSingleAuthor } from "../../controllers/authorController.js";

export const authorRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Authors
 *   description: Endpoints for managing authors
 */

/**
 * @swagger
 * /authors:
 *   get:
 *     summary: Get list of all authors along with thier book count
 *     description: retrieve a list of authors with optional filtering by different categories
 *     tags: [Authors]
 *     parameters: 
 *       - in: query
 *         name: name
 *         schema: 
 *           type: string
 *         description: Filter authors by name
 *       - in: query
 *         name: order
 *         schema: 
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort authors by book counts in ascending or descending order
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
 *         description: List of authors retrieved successfully
 *         content: 
 *           application/json:
 *             schema: 
 *               type: object
 *               properties: 
 *                 msg: 
 *                   type: string
 *                   example: Authors retrieved successfully
 *                 data: 
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties: 
 *                       id: 
 *                         type: integer
 *                       name: 
 *                         type: string
 *                       email: 
 *                         type: string
 *                       books_count: 
 *                         type: integer
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
 *         description: No authors found
 * 
 *   post:
 *     summary: Create a new author
 *     description: Add a new author into the database
 *     tags: [Authors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties: 
 *               name:
 *                 type: string
 *                 example: author1
 *               email: 
 *                 type: string
 *                 example: one@gmail.com   
 *                 description : must be unique
 *               cretated_at: 
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-14T06:47:02Z"
 *                 description: Optional.
 *     responses: 
 *       200: 
 *         description: Author created successfully
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Author created successfully
 *       409: 
 *         description: Author with this email already exists
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Author with this email already exists
 */

/**
 * @swagger
 * /authors/{authorId}:
 *   get:
 *     summary: Get a single author by ID
 *     description: Retrieve a single author and their associated books from the database.
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the author
 *     responses:
 *       200:
 *         description: Author retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Author retrieved successfully
 *               data:
 *                 id: 1
 *                 name: "J.K. Rowling"
 *                 email: "jk.rowling@gmail.com"
 *                 created_at: "2025-09-12T06:47:02Z"
 *                 books:
 *                   - id: 10
 *                     title: "Harry Potter and the Philosopher's Stone"
 *                     isbn: "1234567890"
 *                     published_year: 1997
 *                     created_at: "2025-09-12T06:47:02Z"
 *                   - id: 11
 *                     title: "Harry Potter and the Chamber of Secrets"
 *                     isbn: "0987654321"
 *                     published_year: 1998
 *                     created_at: "2025-09-13T06:47:02Z"
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "Author with the given id 99 does not exist"
 */

authorRouter.post('/', authenticateToken, createAuthorValidation, validationErrorHandler , createAuthor);
authorRouter.get('/', getAuthorValidation, validationErrorHandler , getAllAuthors);
authorRouter.get('/:authorId', getSingleAuthorValidation, validationErrorHandler , getSingleAuthor);

