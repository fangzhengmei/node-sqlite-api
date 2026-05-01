import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createBooks = asyncHandler(async(req, res)=>{
    const { title, isbn , published_year, author_id } = req.body;
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
    const sql = `INSERT INTO books
    (title, isbn, published_year, author_id)
    VALUES
    (?,?,?,?)`
    await execute(db, sql, [title, isbn, published_year, author_id]);
    logger.info(`Book created successfully, title : ${title} ISBN: ${isbn}`);
    return res.status(200).json({msg:'Book created successfully'});
});

export const getAllBooks = asyncHandler(async(req, res)=>{
    let { title , year , order, sort, author, page, limit} = req.query;
    page = parseInt(page) > 0 ? parseInt(page) : 1,
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;

    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; 
    let sql = `SELECT books.*,authors.name AS author FROM books
    JOIN authors 
    ON books.author_id = authors.id`;
    const params = [];
    const searchFields = [];
    if(title && year){
        sql += ` WHERE books.title LIKE ? AND books.published_year = ?`; 
        params.push(`%${title}%`);
        params.push(`${year}`);
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
        sql += ` ORDER BY ${sort} ${order}`;
    }
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, startIndex);

    logger.info(
        `Fetching books | filters: title=${title || "any"}, year=${year || "any"}, author=${author || "any"}, sort=${sort || "none"}, order=${order}, page=${page}, limit=${limit}`
    )
    const books = await fetchAll(db, sql, params);
    if(!books || books.length==0){
        logger.warn("No books found for the given filters");
        return res.status(204).json({msg:"No any books in the list yet"});
    }
    logger.info(`Books retrived successfully | counts = ${books.length}`)
    return res.status(200).json({msg:'books retreiveed sucessfully', data : books});
})

export const getSingleBook = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const findBookSQL = `
        SELECT 
        authors.id AS author_id,authors.name, authors.email, authors.cretated_at AS author_created_at,
        books.id AS book_id,books.title,books.isbn,books.published_year,books.created_at AS book_created_at
        FROM authors
        JOIN books ON authors.id = books.author_id
        WHERE authors.id = ?
    `;
    logger.info(`Attempting to retrieve book and book author info for book with id ${id}`);
    const book = await fetchFirst(db, findBookSQL, [id]);
    if(!book){
        logger.warn(`Book with id ${id} does not exist`)
        const error = new Error(`No book with id ${id} exists in the books table`);
        error.statusCode = 404; 
        throw error;
    }
    logger.info(`Book retrieved successfully`);
    return res.status(200).json({msg:'book retreived sucessfully', data : book});
})

export const updateBooks = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { title, isbn , published_year, author_id} = req.body;
    if (!title && !isbn && !published_year && !author_id) {
        logger.warn(`At least one of the fields from title, isbn, published_year or author_id must be provided for updation`)
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
        error.statusCode = 400; 
        throw error;
    } 
    let updateSQL = 'UPDATE books'
    const params = []
    const searchFields = []
    if (title) {
        searchFields.push(`title = ?`);
        params.push(`${title}`);
    }
    if(isbn){
        const findDuplicateSQL = `
            SELECT * FROM books
            WHERE isbn = ?
        ` 
        const duplicateBook = await fetchFirst(db, findDuplicateSQL, [isbn]);
        if(duplicateBook && duplicateBook.id !== id){
            logger.warn(`Book with the same ISBN ${isbn} already exists and the isbn is supposed to be unique hence the isbn cannot be updated to ${isbn}`);
            const error = new Error("Book with this isbn already exists, update it to something else");
            error.statusCode = 409; 
            throw error;
        }
        searchFields.push(`isbn = ?`)
        params.push(`${isbn}`);
    }
    if(published_year){
        searchFields.push(`published_year = ?`)
        params.push(`${published_year}`);
    }
    if(author_id){
        searchFields.push(`author_id = ?`)
        params.push(`${author_id}`);
    }
    if(searchFields.length>0){
        updateSQL += ` SET ` + searchFields.join(', ');
    }
    updateSQL += ` WHERE id = ?`
    params.push(id); 
    logger.info(
        `Updating books | update fields : title=${title || "any"}, isbn = ${isbn || "any"}, published_year=${published_year || "any"}, author_id=${author_id || "any"}`
    )
    await execute(db, updateSQL, params) ;
    logger.info(`Book updated successfully`);
    return res.status(200).json({msg:'Book updated successfully'});
})