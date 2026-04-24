import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

const getBookCategories = async (bookId) => {
    const categoriesSQL = `
        SELECT c.* FROM categories c
        JOIN book_categories bc ON c.id = bc.category_id
        WHERE bc.book_id = ?
        ORDER BY c.id
    `;
    return await fetchAll(db, categoriesSQL, [bookId]);
};

export const createBooks = asyncHandler(async(req, res)=>{
    const { title, isbn , published_year, author_id, category_ids } = req.body;
    logger.info(`Attempting to create book with unique isbn : ${isbn}`);

    const checksDuplicacySQL = `
        SELECT * FROM books
        WHERE isbn = ?
    `;
    const duplicate = await fetchFirst(db, checksDuplicacySQL, [isbn] );
    if(duplicate){
        logger.warn(`Duplicate ISBN error : ${isbn}`)
        const error = new Error("Book with this isbn already exists");
        error.statusCode = 409; 
        throw error;
    }

    const checkAuthorSQL = `
        SELECT * FROM authors
        WHERE id = ?
    `
    const author = await fetchFirst(db, checkAuthorSQL, [author_id]);
    if(!author){
        logger.warn(`Invalid author_id : ${author_id} while creating book with isbn ${isbn}`)
        const error = new Error(`No such author with id ${author_id} exists in the author table`);
        error.statusCode = 400; 
        throw error;
    }

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
        for (const categoryId of category_ids) {
            const checkCategorySQL = `SELECT * FROM categories WHERE id = ?`;
            const category = await fetchFirst(db, checkCategorySQL, [categoryId]);
            if (!category) {
                logger.warn(`Invalid category_id: ${categoryId}`);
                const error = new Error(`No such category with id ${categoryId} exists`);
                error.statusCode = 400;
                throw error;
            }
        }
    }

    db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        
        try {
            const sql = `INSERT INTO books
            (title, isbn, published_year, author_id)
            VALUES
            (?,?,?,?)`;
            
            await new Promise((resolve, reject) => {
                db.run(sql, [title, isbn, published_year, author_id], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            }).then(async (bookId) => {
                if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
                    for (const categoryId of category_ids) {
                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)`,
                                [bookId, categoryId],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    }
                }
                
                db.run('COMMIT');
                logger.info(`Book created successfully, title : ${title} ISBN: ${isbn}`);
                return res.status(201).json({msg:'Book created successfully'});
            });
        } catch (err) {
            db.run('ROLLBACK');
            throw err;
        }
    });
});

export const getAllBooks = asyncHandler(async(req, res)=>{
    let { title , year , order, sort, author, page, limit, category_id } = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;

    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; 
    
    let sql = `SELECT DISTINCT books.*, authors.name AS author FROM books
    JOIN authors 
    ON books.author_id = authors.id`;
    
    const params = [];
    const searchFields = [];
    
    if (category_id) {
        sql += ` JOIN book_categories ON books.id = book_categories.book_id`;
        searchFields.push(`book_categories.category_id = ?`);
        params.push(parseInt(category_id));
    }
    
    if (title) {
        searchFields.push(`books.title LIKE ?`);
        params.push(`%${title}%`);
    }
    if(year){
        searchFields.push(`books.published_year = ?`)
        params.push(`${year}`);
    }
    if(author){
        searchFields.push(`authors.name LIKE ?`)
        params.push(`%${author}%`);
    }
    
    if(searchFields.length>0){
        sql+= ` WHERE ` + searchFields.join(' AND ');
    }
    
    const sortBy = ["title", "published_year", "created_at"];
    if (sort && sortBy.includes(sort)) {
        sql += ` ORDER BY books.${sort} ${order}`;
    } else {
        sql += ` ORDER BY books.id ${order}`;
    }
    
    const countSQL = sql.replace(/SELECT DISTINCT books\.\*.*FROM/, 'SELECT COUNT(DISTINCT books.id) as total FROM');
    const countResult = await fetchFirst(db, countSQL, params);
    const total = countResult.total;
    
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, startIndex);

    logger.info(
        `Fetching books | filters: title=${title || "any"}, year=${year || "any"}, author=${author || "any"}, category=${category_id || "any"}, sort=${sort || "none"}, order=${order}, page=${page}, limit=${limit}`
    )
    const books = await fetchAll(db, sql, params);
    
    if(!books || books.length==0){
        logger.warn("No books found for the given filters");
        return res.status(204).json({msg:"No any books in the list yet"});
    }
    
    for (const book of books) {
        book.categories = await getBookCategories(book.id);
    }
    
    logger.info(`Books retrived successfully | counts = ${books.length}`)
    return res.status(200).json({
        msg:'books retreiveed sucessfully', 
        data: books,
        pagination: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        }
    });
})

export const getSingleBook = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const findBookSQL = `
        SELECT 
        authors.id AS author_id,authors.name, authors.email, authors.cretated_at AS author_created_at,
        books.id AS book_id,books.title,books.isbn,books.published_year,books.created_at AS book_created_at
        FROM authors
        JOIN books ON authors.id = books.author_id
        WHERE books.id = ?
    `;
    logger.info(`Attempting to retrieve book and book author info for book with id ${id}`);
    const book = await fetchFirst(db, findBookSQL, [id]);
    if(!book){
        logger.warn(`Book with id ${id} does not exist`)
        const error = new Error(`No book with id ${id} exists in the books table`);
        error.statusCode = 404; 
        throw error;
    }
    
    const categories = await getBookCategories(id);
    
    logger.info(`Book retrieved successfully`);
    return res.status(200).json({
        msg:'book retreived sucessfully', 
        data: {
            ...book,
            categories: categories
        }
    });
})

export const updateBooks = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { title, isbn , published_year, author_id, category_ids} = req.body;
    if (!title && !isbn && !published_year && !author_id && !category_ids) {
        logger.warn(`At least one of the fields from title, isbn, published_year, author_id, or category_ids must be provided for updation`)
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }

    const findBookSQL = `
        SELECT * FROM books
        WHERE id = ?
    ` 
    logger.info(`Attempting to retrive the book to be updated`);
    const foundBook = await fetchFirst(db, findBookSQL, [id]);
    if(!foundBook){
        logger.warn(`Book with id ${id} does not exist in the books table`)
        const error = new Error(`No such book with id ${id} exists in the books table`);
        error.statusCode = 404; 
        throw error;
    } 

    if (category_ids && Array.isArray(category_ids)) {
        for (const categoryId of category_ids) {
            const checkCategorySQL = `SELECT * FROM categories WHERE id = ?`;
            const category = await fetchFirst(db, checkCategorySQL, [categoryId]);
            if (!category) {
                logger.warn(`Invalid category_id: ${categoryId}`);
                const error = new Error(`No such category with id ${categoryId} exists`);
                error.statusCode = 404;
                throw error;
            }
        }
    }
    
    let updateSQL = 'UPDATE books'
    const params = []
    const updateFields = []
    if (title) {
        updateFields.push(`title = ?`);
        params.push(`${title}`);
    }
    if(isbn){
        const findDuplicateSQL = `
            SELECT * FROM books
            WHERE isbn = ?
        ` 
        const duplicateBook = await fetchFirst(db, findDuplicateSQL, [isbn]);
        if(duplicateBook && duplicateBook.id !== parseInt(id)){
            logger.warn(`Book with the same ISBN ${isbn} already exists and the isbn is supposed to be unique hence the isbn cannot be updated to ${isbn}`);
            const error = new Error("Book with this isbn already exists, update it to something else");
            error.statusCode = 409; 
            throw error;
        }
        updateFields.push(`isbn = ?`)
        params.push(`${isbn}`);
    }
    if(published_year){
        updateFields.push(`published_year = ?`)
        params.push(`${published_year}`);
    }
    if(author_id){
        updateFields.push(`author_id = ?`)
        params.push(`${author_id}`);
    }
    
    if(updateFields.length>0){
        updateSQL += ` SET ` + updateFields.join(', ');
        updateSQL += ` WHERE id = ?`
        params.push(id);
        
        logger.info(
            `Updating books | update fields : title=${title || "any"}, isbn = ${isbn || "any"}, published_year=${published_year || "any"}, author_id=${author_id || "any"}`
        )
        await execute(db, updateSQL, params) ;
    }
    
    if (category_ids !== undefined && Array.isArray(category_ids)) {
        const deleteOldSQL = `DELETE FROM book_categories WHERE book_id = ?`;
        await execute(db, deleteOldSQL, [id]);
        
        if (category_ids.length > 0) {
            const insertSQL = `INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES ${category_ids.map(() => '(?, ?)').join(', ')}`;
            const insertParams = [];
            for (const categoryId of category_ids) {
                insertParams.push(id, categoryId);
            }
            await execute(db, insertSQL, insertParams);
        }
        logger.info(`Book categories updated for book ${id}`);
    }
    
    logger.info(`Book updated successfully`);
    return res.status(200).json({msg:'Book updated successfully'});
})
