import { Router } from "express";
import { getAllReadersValidator, getSingleReaderValidator, updateReaderValidator, validateCreateReader } from "../../validation/readerValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import { createReader, getAllReaders, getSingleReader, updateReader, deleteReader } from "../../controllers/readerController.js";

export const readerRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Readers
 *   description: Endpoints for managing readers
 */

/**
 * @swagger
 * /readers:
 *   get:
 *     summary: Get list of all readers
 *     description: retrieve a list of readers with optional filtering and pagination
 *     tags: [Readers]
 *     parameters: 
 *       - in: query
 *         name: name
 *         schema: 
 *           type: string
 *         description: Filter readers by name
 *       - in: query
 *         name: email
 *         schema: 
 *           type: string
 *         description: Filter readers by email
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
 *           enum: [name, email, created_at]
 *         description: Sort readers by field
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
 *         description: List of readers retrieved successfully
 *         content: 
 *           application/json:
 *             schema: 
 *               type: object
 *               properties: 
 *                 msg: 
 *                   type: string
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
 *                          type: string
 *                       phone: 
 *                         type: string
 *                       address: 
 *                         type: string
 *                       borrow_count:
 *                         type: integer
 *                       created_at:    
 *                         type: string
 *       204: 
 *         description: No readers found
 * 
 *   post:
 *     summary: Create a new reader
 *     description: Add a new reader into the database
 *     tags: [Readers]
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
 *                 example: John Doe
 *               email: 
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phone:
 *                  type: string
 *                  example: 1234567890
 *               address:
 *                  type: string
 *                  example: 123 Main St
 *     responses: 
 *       200: 
 *         description: Reader created successfully
 *       409: 
 *         description: Reader with this email already exists
 */

/**
 * @swagger
 * /readers/{id}:
 *   get:
 *     summary: Get a single reader by ID
 *     description: Retrieve a single reader and their borrow records
 *     tags: [Readers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the reader
 *     responses:
 *       200:
 *         description: Reader retrieved successfully
 *       404:
 *         description: Reader not found
 *   put:
 *     summary: Update a reader by ID
 *     description: Update one or more fields of a reader
 *     tags: [Readers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the reader to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Reader updated successfully
 *       404:
 *         description: Reader not found
 *       409:
 *         description: Duplicate email
 *   delete:
 *     summary: Delete a reader by ID
 *     description: Delete a reader (only if no active borrow records)
 *     tags: [Readers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the reader to delete
 *     responses:
 *       200:
 *         description: Reader deleted successfully
 *       404:
 *         description: Reader not found
 *       400:
 *         description: Reader has active borrow records
 */

readerRouter.post('/', validateCreateReader, validationErrorHandler, createReader);
readerRouter.get('/', getAllReadersValidator, validationErrorHandler, getAllReaders);
readerRouter.get('/:id', getSingleReaderValidator, validationErrorHandler, getSingleReader);
readerRouter.put('/:id', updateReaderValidator, validationErrorHandler, updateReader);
readerRouter.delete('/:id', getSingleReaderValidator, validationErrorHandler, deleteReader);
