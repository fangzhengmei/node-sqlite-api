import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";
import { NotFoundError } from '../errors/AppError.js';

export const createBooks = asyncHandler(async(req, res)=>{
    const { title, isbn , published_year, author_id } = req.body;
    logger.info(`Attempting to create book with unique isbn : ${isbn}`);
    
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
        WHERE books.id = ?
    `;
    logger.info(`Attempting to retrieve book and book author info for book with id ${id}`);
    const book = await fetchFirst(db, findBookSQL, [id]);
    if(!book){
        logger.warn(`Book with id ${id} does not exist`)
        throw new NotFoundError(`Book with id ${id} not found`);
    }
    logger.info(`Book retrieved successfully`);
    return res.status(200).json({msg:'book retreived sucessfully', data : book});
})

export const updateBooks = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { title, isbn , published_year, author_id} = req.body;
    
    let updateSQL = 'UPDATE books'
    const params = []
    const searchFields = []
    if (title) {
        searchFields.push(`title = ?`);
        params.push(`${title}`);
    }
    if(isbn){
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
