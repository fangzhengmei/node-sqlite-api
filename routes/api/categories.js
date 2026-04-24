import { Router } from "express";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategory,
  validateGetAllCategories,
  validateGetBooksByCategory,
  validateBookCategories
} from "../../validation/categoryValidator.js";
import { validationErrorHandler } from "../../middlewares/validatorErrorHandler.js";
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getBooksByCategory,
  setBookCategories,
  getBookCategories
} from "../../controllers/categoryController.js";

export const categoryRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Endpoints for managing book categories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get list of all categories
 *     description: Retrieve a list of categories with optional filtering and pagination
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter categories by name (partial match)
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: integer
 *         description: Filter by parent category ID. Use "null" for root categories
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *           enum: [name, id, created_at, updated_at]
 *         description: Sort by field
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
 *           default: 100
 *         description: Number of results per page
 *       - in: query
 *         name: include_children
 *         schema:
 *           type: boolean
 *         description: Include children in the result as nested structure
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *       204:
 *         description: No categories found
 *
 *   post:
 *     summary: Create a new category
 *     description: Add a new category to the database
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Fiction"
 *                 description: Category name (must be unique)
 *               description:
 *                 type: string
 *                 example: "Fictional books and novels"
 *                 description: Optional description of the category
 *               parent_id:
 *                 type: integer
 *                 example: 1
 *                 description: Parent category ID for hierarchical categorization
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the category is active
 *     responses:
 *       201:
 *         description: Category created successfully
 *       409:
 *         description: Category with this name already exists
 */

/**
 * @swagger
 * /categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     description: Retrieve categories in a hierarchical tree structure
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get a single category by ID
 *     description: Retrieve a single category with its children and statistics
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the category
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 *
 *   put:
 *     summary: Update a category by ID
 *     description: Update one or more fields of a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the category to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Category Name"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               parent_id:
 *                 type: integer
 *                 example: 2
 *                 description: Set to null to make it a root category
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: No fields provided or invalid parent
 *       404:
 *         description: Category not found
 *       409:
 *         description: Duplicate category name
 *
 *   delete:
 *     summary: Delete a category by ID
 *     description: Delete a category. Cannot delete if it has children.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The unique ID of the category to delete
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Category has children, cannot delete
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /categories/{id}/books:
 *   get:
 *     summary: Get books by category
 *     description: Retrieve all books belonging to a specific category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The category ID
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter books by title
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter books by published year
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
 *           enum: [title, published_year, created_at]
 *         description: Sort by field
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 *       204:
 *         description: No books found for this category
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /books/{bookId}/categories:
 *   get:
 *     summary: Get categories for a book
 *     description: Retrieve all categories associated with a specific book
 *     tags: [Books, Categories]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The book ID
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       404:
 *         description: Book not found
 *
 *   put:
 *     summary: Set categories for a book
 *     description: Replace all categories for a book with the provided list
 *     tags: [Books, Categories]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_ids
 *             properties:
 *               category_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *                 description: Array of category IDs to assign to the book. Empty array removes all categories.
 *     responses:
 *       200:
 *         description: Book categories updated successfully
 *       404:
 *         description: Book or category not found
 */

categoryRouter.get('/tree', validateGetAllCategories, validationErrorHandler, getCategoryTree);
categoryRouter.post('/', validateCreateCategory, validationErrorHandler, createCategory);
categoryRouter.get('/', validateGetAllCategories, validationErrorHandler, getAllCategories);
categoryRouter.get('/:id', validateGetCategory, validationErrorHandler, getSingleCategory);
categoryRouter.put('/:id', validateUpdateCategory, validationErrorHandler, updateCategory);
categoryRouter.delete('/:id', validateGetCategory, validationErrorHandler, deleteCategory);
categoryRouter.get('/:id/books', validateGetBooksByCategory, validationErrorHandler, getBooksByCategory);
