import { Router } from "express";
import { getReadersValidation, getSingleReaderValidation, updateReaderValidation, createReaderValidation } from "../../validation/readerValidator.js";
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
 *     summary: Get list of all readers along with their borrow count
 *     description: retrieve a list of readers with optional filtering by different categories
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
 *         description: Sort readers in ascending or descending order
 *       - in: query
 *         name: sort
 *         schema: 
 *           type: string
 *           enum: [name, email, created_at]
 *         description: Sort readers by different options like name, email, created_at
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
 *                   example: Readers retrieved successfully
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
 *         description: No readers found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No any readers in the list yet"
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
 *                 example: reader1
 *               email: 
 *                 type: string
 *                 example: reader1@gmail.com   
 *                 description : must be unique
 *               phone:
 *                  type: string
 *                  example: 13800138001
 *               address:
 *                  type: string
 *                  example: 北京市朝阳区
 *               created_at: 
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-14T06:47:02Z"
 *                 description: Optional.
 *     responses: 
 *       200: 
 *         description: Reader created successfully
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Reader created successfully
 *       409: 
 *         description: Reader with this email already exists
 *         content: 
 *           application/json:
 *             example: 
 *               msg: Reader with this email already exists
 */

/**
 * @swagger
 * /readers/{id}:
 *   get:
 *     summary: Get a single reader by ID
 *     description: Retrieve a single reader and their associated borrow records from the database.
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
 *         content:
 *           application/json:
 *             example:
 *               msg: Reader retrieved successfully
 *               data:
 *                 id: 1
 *                 name: "张三"
 *                 email: "zhangsan@example.com"
 *                 phone: "13800138001"
 *                 address: "北京市朝阳区"
 *                 created_at: "2025-09-12T06:47:02Z"
 *                 borrow_records:
 *                   - id: 10
 *                     book_id: 1
 *                     book_title: "Harry Potter"
 *                     book_isbn: "1234567890"
 *                     borrow_date: "2025-09-12T06:47:02Z"
 *                     due_date: "2025-10-12T06:47:02Z"
 *                     return_date: null
 *                     status: "borrowed"
 *       404:
 *         description: Reader not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "Reader with the given id 99 does not exist"
 *   put:
 *     summary: Update a reader by ID
 *     description: Update one or more fields of a reader in the database. At least one field must be provided.
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
 *                 example: "New Reader Name"
 *                 description: The new name of the reader
 *               email:
 *                 type: string
 *                 example: "newemail@gmail.com"
 *                 description: The email (must be unique)
 *               phone:
 *                 type: string
 *                 example: "13900139002"
 *                 description: Phone number
 *               address:
 *                 type: string
 *                 example: "上海市浦东新区"
 *                 description: Address
 *             minProperties: 1
 *             description: At least one field is required for update
 *     responses:
 *       200:
 *         description: Reader updated successfully
 *         content:
 *           application/json:
 *             example:
 *               msg: "Reader updated successfully"
 *       404:
 *         description: Reader not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No such reader with id 99 exists"
 *       409:
 *         description: Duplicate email
 *         content:
 *           application/json:
 *             example:
 *               msg: "Reader with this email already exists"
 *   delete:
 *     summary: Delete a reader by ID
 *     description: Delete a reader from the database. Reader cannot be deleted if they have active borrow records.
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
 *         content:
 *           application/json:
 *             example:
 *               msg: "Reader deleted successfully"
 *       404:
 *         description: Reader not found
 *         content:
 *           application/json:
 *             example:
 *               msg: "No such reader with id 99 exists"
 *       400:
 *         description: Reader has active borrow records
 *         content:
 *           application/json:
 *             example:
 *               msg: "Cannot delete reader with active borrow records. Please return all books first."
 */

readerRouter.post('/', createReaderValidation, validationErrorHandler, createReader);
readerRouter.get('/', getReadersValidation, validationErrorHandler, getAllReaders);
readerRouter.get('/:id', getSingleReaderValidation, validationErrorHandler, getSingleReader);
readerRouter.put('/:id', updateReaderValidation, validationErrorHandler, updateReader);
readerRouter.delete('/:id', getSingleReaderValidation, validationErrorHandler, deleteReader);
