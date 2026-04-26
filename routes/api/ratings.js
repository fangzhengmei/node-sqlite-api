import { Router } from "express";
import { validateCreateRating, getRatingsByBookIdValidator } from "../../validation/ratingValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { createRating, getRatingsByBookId } from "../../controllers/ratingsController.js";

export const ratingRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Endpoints for managing book ratings
 */

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a new rating for a book
 *     description: Add a rating (1-5 stars) and optional comment for a book
 *     tags: [Ratings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - book_id
 *               - rating
 *             properties:
 *               book_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the book being rated
 *               rating:
 *                 type: integer
 *                 example: 5
 *                 description: Rating from 1 to 5
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 example: "This book is amazing!"
 *                 description: Optional comment about the book
 *               reader_name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Optional name of the reader
 *     responses:
 *       201:
 *         description: Rating created successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Rating created successfully
 *       400:
 *         description: Invalid book ID or validation error
 *         content:
 *           application/json:
 *             example:
 *               msg: No such book with id 99 exists
 */

/**
 * @swagger
 * /ratings/book/{book_id}:
 *   get:
 *     summary: Get all ratings for a specific book
 *     description: Retrieve all ratings and comments for a book, including average rating and total ratings
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: book_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the book
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
 *         description: Ratings retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: Ratings retrieved successfully
 *               data:
 *                 - id: 1
 *                   book_id: 1
 *                   rating: 5
 *                   comment: "Great book!"
 *                   reader_name: "John"
 *                   created_at: "2025-09-14T06:47:02Z"
 *               statistics:
 *                 average_rating: 4.5
 *                 total_ratings: 10
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 total: 10
 *                 total_pages: 1
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             example:
 *               msg: No such book with id 99 exists
 */

ratingRouter.post('/', validateCreateRating, validationErrorHandler, createRating);
ratingRouter.get('/book/:book_id', getRatingsByBookIdValidator, validationErrorHandler, getRatingsByBookId);
