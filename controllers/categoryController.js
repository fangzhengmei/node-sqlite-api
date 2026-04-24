import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter(cat => cat.parent_id === parentId)
    .map(cat => ({
      ...cat,
      children: buildCategoryTree(categories, cat.id)
    }));
};

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parent_id, is_active } = req.body;
  
  logger.info(`Attempting to create category: ${name}`);

  const checkDuplicateSQL = `SELECT * FROM categories WHERE name = ?`;
  const duplicate = await fetchFirst(db, checkDuplicateSQL, [name]);
  
  if (duplicate) {
    logger.warn(`Duplicate category name: ${name}`);
    const error = new Error("Category with this name already exists");
    error.statusCode = 409;
    throw error;
  }

  if (parent_id) {
    const checkParentSQL = `SELECT * FROM categories WHERE id = ?`;
    const parent = await fetchFirst(db, checkParentSQL, [parent_id]);
    if (!parent) {
      logger.warn(`Invalid parent_id: ${parent_id}`);
      const error = new Error(`No such parent category with id ${parent_id} exists`);
      error.statusCode = 400;
      throw error;
    }
  }

  const sql = `INSERT INTO categories (name, description, parent_id, is_active) VALUES (?, ?, ?, ?)`;
  await execute(db, sql, [name, description || null, parent_id || null, is_active !== false ? 1 : 0]);

  logger.info(`Category created successfully: ${name}`);
  return res.status(201).json({ msg: 'Category created successfully' });
});

export const getAllCategories = asyncHandler(async (req, res) => {
  let { name, parent_id, is_active, order, sort, page, limit, include_children } = req.query;
  
  page = parseInt(page) > 0 ? parseInt(page) : 1;
  limit = parseInt(limit) > 0 ? parseInt(limit) : 100;
  const startIndex = (page - 1) * limit;
  order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql = `SELECT c.*, 
             (SELECT COUNT(*) FROM categories c2 WHERE c2.parent_id = c.id) AS children_count,
             (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_id = c.id) AS books_count
             FROM categories c`;
  
  const params = [];
  const searchFields = [];

  if (name) {
    searchFields.push(`c.name LIKE ?`);
    params.push(`%${name}%`);
  }

  if (parent_id !== undefined) {
    if (parent_id === 'null') {
      searchFields.push(`c.parent_id IS NULL`);
    } else {
      searchFields.push(`c.parent_id = ?`);
      params.push(parseInt(parent_id));
    }
  }

  if (is_active !== undefined) {
    searchFields.push(`c.is_active = ?`);
    params.push(is_active ? 1 : 0);
  }

  if (searchFields.length > 0) {
    sql += ` WHERE ` + searchFields.join(' AND ');
  }

  const sortBy = ["name", "id", "created_at", "updated_at"];
  if (sort && sortBy.includes(sort)) {
    sql += ` ORDER BY c.${sort} ${order}`;
  } else {
    sql += ` ORDER BY c.id ${order}`;
  }

  const countSQL = sql.replace(/SELECT c\.\*.*FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*/, '').replace(/LIMIT.*/, '');
  const countResult = await fetchFirst(db, countSQL, params.slice(0, params.length - (sql.includes('LIMIT') ? 2 : 0)));
  const total = countResult.total;

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, startIndex);

  logger.info(
    `Fetching categories | filters: name=${name || "any"}, parent_id=${parent_id || "any"}, is_active=${is_active !== undefined ? is_active : "any"}, sort=${sort || "id"}, order=${order}, page=${page}, limit=${limit}`
  );

  const categories = await fetchAll(db, sql, params);

  if (!categories || categories.length == 0) {
    logger.warn("No categories found for the given filters");
    return res.status(204).json({ msg: "No categories found" });
  }

  let result = categories;
  if (include_children === 'true') {
    const allCategoriesSQL = `SELECT * FROM categories`;
    const allCategories = await fetchAll(db, allCategoriesSQL, []);
    result = buildCategoryTree(categories, null);
  }

  logger.info(`Categories retrieved successfully | count = ${categories.length}`);
  return res.status(200).json({
    msg: 'Categories retrieved successfully',
    data: result,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const getSingleCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findCategorySQL = `
    SELECT c.*,
           (SELECT COUNT(*) FROM categories c2 WHERE c2.parent_id = c.id) AS children_count,
           (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_id = c.id) AS books_count,
           p.name as parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.id = ?
  `;

  logger.info(`Attempting to retrieve category with id ${id}`);
  const category = await fetchFirst(db, findCategorySQL, [id]);

  if (!category) {
    logger.warn(`Category with id ${id} does not exist`);
    const error = new Error(`No category with id ${id} exists`);
    error.statusCode = 404;
    throw error;
  }

  const getChildrenSQL = `SELECT * FROM categories WHERE parent_id = ?`;
  const children = await fetchAll(db, getChildrenSQL, [id]);

  logger.info(`Category retrieved successfully`);
  return res.status(200).json({
    msg: 'Category retrieved successfully',
    data: {
      ...category,
      children: children
    }
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, parent_id, is_active } = req.body;

  if (!name && !description && parent_id === undefined && is_active === undefined) {
    logger.warn(`At least one field must be provided for updation`);
    const error = new Error("At least one field must be provided to update");
    error.statusCode = 400;
    throw error;
  }

  const findCategorySQL = `SELECT * FROM categories WHERE id = ?`;
  logger.info(`Attempting to retrieve the category to be updated`);
  const foundCategory = await fetchFirst(db, findCategorySQL, [id]);

  if (!foundCategory) {
    logger.warn(`Category with id ${id} does not exist`);
    const error = new Error(`No such category with id ${id} exists`);
    error.statusCode = 404;
    throw error;
  }

  if (parent_id !== undefined && parent_id !== null) {
    if (parseInt(parent_id) === parseInt(id)) {
      logger.warn(`Cannot set category as its own parent`);
      const error = new Error("A category cannot be its own parent");
      error.statusCode = 400;
      throw error;
    }

    const checkParentSQL = `SELECT * FROM categories WHERE id = ?`;
    const parent = await fetchFirst(db, checkParentSQL, [parent_id]);
    if (!parent) {
      logger.warn(`Invalid parent_id: ${parent_id}`);
      const error = new Error(`No such parent category with id ${parent_id} exists`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (name) {
    const checkDuplicateSQL = `SELECT * FROM categories WHERE name = ? AND id != ?`;
    const duplicate = await fetchFirst(db, checkDuplicateSQL, [name, id]);
    if (duplicate) {
      logger.warn(`Duplicate category name: ${name}`);
      const error = new Error("Category with this name already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  let updateSQL = 'UPDATE categories SET';
  const params = [];
  const updateFields = [];

  if (name) {
    updateFields.push(`name = ?`);
    params.push(name);
  }
  if (description !== undefined) {
    updateFields.push(`description = ?`);
    params.push(description);
  }
  if (parent_id !== undefined) {
    updateFields.push(`parent_id = ?`);
    params.push(parent_id === null ? null : parent_id);
  }
  if (is_active !== undefined) {
    updateFields.push(`is_active = ?`);
    params.push(is_active ? 1 : 0);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  if (updateFields.length > 0) {
    updateSQL += ` ` + updateFields.join(', ');
  }

  updateSQL += ` WHERE id = ?`;
  params.push(id);

  logger.info(`Updating category with id ${id}`);
  await execute(db, updateSQL, params);

  logger.info(`Category updated successfully`);
  return res.status(200).json({ msg: 'Category updated successfully' });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findCategorySQL = `SELECT * FROM categories WHERE id = ?`;
  logger.info(`Attempting to retrieve the category to be deleted`);
  const foundCategory = await fetchFirst(db, findCategorySQL, [id]);

  if (!foundCategory) {
    logger.warn(`Category with id ${id} does not exist`);
    const error = new Error(`No such category with id ${id} exists`);
    error.statusCode = 404;
    throw error;
  }

  const checkChildrenSQL = `SELECT COUNT(*) as count FROM categories WHERE parent_id = ?`;
  const childrenResult = await fetchFirst(db, checkChildrenSQL, [id]);
  if (childrenResult.count > 0) {
    logger.warn(`Category with id ${id} has ${childrenResult.count} children`);
    const error = new Error(`Cannot delete category with ${childrenResult.count} children. Please delete or reassign them first.`);
    error.statusCode = 400;
    throw error;
  }

  const checkBooksSQL = `SELECT COUNT(*) as count FROM book_categories WHERE category_id = ?`;
  const booksResult = await fetchFirst(db, checkBooksSQL, [id]);
  if (booksResult.count > 0) {
    logger.warn(`Category with id ${id} has ${booksResult.count} books associated`);
  }

  const deleteSQL = `DELETE FROM categories WHERE id = ?`;
  await execute(db, deleteSQL, [id]);

  logger.info(`Category deleted successfully`);
  return res.status(200).json({ msg: 'Category deleted successfully', deleted_books_count: booksResult.count });
});

export const getCategoryTree = asyncHandler(async (req, res) => {
  const { is_active } = req.query;

  let sql = `SELECT c.*,
             (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_id = c.id) AS books_count
             FROM categories c`;
  
  const params = [];

  if (is_active !== undefined) {
    sql += ` WHERE c.is_active = ?`;
    params.push(is_active === 'true' ? 1 : 0);
  }

  sql += ` ORDER BY c.parent_id, c.id`;

  logger.info(`Fetching category tree`);
  const categories = await fetchAll(db, sql, params);

  const tree = buildCategoryTree(categories, null);

  logger.info(`Category tree retrieved successfully | count = ${categories.length}`);
  return res.status(200).json({
    msg: 'Category tree retrieved successfully',
    data: tree
  });
});

export const getBooksByCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { title, year, order, sort, page, limit } = req.query;

  page = parseInt(page) > 0 ? parseInt(page) : 1;
  limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
  const startIndex = (page - 1) * limit;
  order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const checkCategorySQL = `SELECT * FROM categories WHERE id = ?`;
  const category = await fetchFirst(db, checkCategorySQL, [id]);
  if (!category) {
    logger.warn(`Category with id ${id} does not exist`);
    const error = new Error(`No category with id ${id} exists`);
    error.statusCode = 404;
    throw error;
  }

  let sql = `SELECT DISTINCT books.*, authors.name AS author FROM books
    JOIN authors ON books.author_id = authors.id
    JOIN book_categories ON books.id = book_categories.book_id
    WHERE book_categories.category_id = ?`;

  const params = [id];
  const searchFields = [];

  if (title) {
    searchFields.push(`books.title LIKE ?`);
    params.push(`%${title}%`);
  }
  if (year) {
    searchFields.push(`books.published_year = ?`);
    params.push(`${year}`);
  }

  if (searchFields.length > 0) {
    sql += ` AND ` + searchFields.join(' AND ');
  }

  const countSQL = sql.replace(/SELECT DISTINCT books\.\*.*FROM/, 'SELECT COUNT(DISTINCT books.id) as total FROM');
  const countResult = await fetchFirst(db, countSQL, params);
  const total = countResult.total;

  const sortBy = ["title", "published_year", "created_at"];
  if (sort && sortBy.includes(sort)) {
    sql += ` ORDER BY ${sort} ${order}`;
  } else {
    sql += ` ORDER BY books.id ${order}`;
  }

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, startIndex);

  logger.info(
    `Fetching books for category ${id} | filters: title=${title || "any"}, year=${year || "any"}, sort=${sort || "id"}, order=${order}, page=${page}, limit=${limit}`
  );

  const books = await fetchAll(db, sql, params);

  if (!books || books.length == 0) {
    logger.warn("No books found for the given filters");
    return res.status(204).json({ msg: "No books found for this category" });
  }

  logger.info(`Books retrieved successfully | count = ${books.length}`);
  return res.status(200).json({
    msg: 'Books retrieved successfully',
    category: category,
    data: books,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const setBookCategories = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { category_ids } = req.body;

  const checkBookSQL = `SELECT * FROM books WHERE id = ?`;
  const book = await fetchFirst(db, checkBookSQL, [bookId]);
  if (!book) {
    logger.warn(`Book with id ${bookId} does not exist`);
    const error = new Error(`No book with id ${bookId} exists`);
    error.statusCode = 404;
    throw error;
  }

  for (const categoryId of category_ids) {
    const checkCategorySQL = `SELECT * FROM categories WHERE id = ?`;
    const category = await fetchFirst(db, checkCategorySQL, [categoryId]);
    if (!category) {
      logger.warn(`Category with id ${categoryId} does not exist`);
      const error = new Error(`No category with id ${categoryId} exists`);
      error.statusCode = 404;
      throw error;
    }
  }

  const deleteOldSQL = `DELETE FROM book_categories WHERE book_id = ?`;
  await execute(db, deleteOldSQL, [bookId]);

  if (category_ids && category_ids.length > 0) {
    const insertSQL = `INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES ${category_ids.map(() => '(?, ?)').join(', ')}`;
    const insertParams = [];
    for (const categoryId of category_ids) {
      insertParams.push(bookId, categoryId);
    }
    await execute(db, insertSQL, insertParams);
  }

  logger.info(`Book categories updated successfully for book ${bookId}`);
  return res.status(200).json({ msg: 'Book categories updated successfully' });
});

export const getBookCategories = asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const checkBookSQL = `SELECT * FROM books WHERE id = ?`;
  const book = await fetchFirst(db, checkBookSQL, [bookId]);
  if (!book) {
    logger.warn(`Book with id ${bookId} does not exist`);
    const error = new Error(`No book with id ${bookId} exists`);
    error.statusCode = 404;
    throw error;
  }

  const sql = `SELECT c.* FROM categories c
    JOIN book_categories bc ON c.id = bc.category_id
    WHERE bc.book_id = ?
    ORDER BY c.id`;

  logger.info(`Fetching categories for book ${bookId}`);
  const categories = await fetchAll(db, sql, [bookId]);

  logger.info(`Categories retrieved successfully | count = ${categories.length}`);
  return res.status(200).json({
    msg: 'Book categories retrieved successfully',
    data: categories
  });
});
