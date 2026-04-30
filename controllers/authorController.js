import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createAuthor = asyncHandler(async(req , res) =>{
    const { name , email} = req.body;
    logger.info(`Attempting to create author with unique emal : ${email}`);
    const checkSql = `SELECT * FROM authors WHERE email = ? AND deleted_at IS NULL`;
    const existing = await fetchFirst(db, checkSql, [email]);
    if (existing) {
        logger.warn(`Duplicate author error : Author with the ${email} already exists`)
        const error = new Error("Author with this email already exists");
        error.statusCode = 409; 
        throw error;
    }
    const sql = `INSERT INTO authors(name, email) VALUES (?,?)`;
    await execute(db, sql, [name, email]);
    logger.info(`Author created successfully, email : ${email} name: ${name}`);
    return res.status(200).json({msg:'Author created successfully'})
});

export const getAllAuthors = asyncHandler(async(req,res)=>{
    let {name , order , page, limit} = req.query;
    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;
    
    let sql = `
        SELECT authors.*, COUNT(books.id) AS books_count FROM authors 
        LEFT JOIN books
        ON authors.id = books.author_id AND books.deleted_at IS NULL
        WHERE authors.deleted_at IS NULL
    `
    const params = []
    if(name){
        sql+= ` AND authors.name LIKE ?`;
        params.push(`%${name}%`)
    };
    sql += ` GROUP BY authors.id`;
    sql += ` ORDER BY books_count ${order}`;
    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, startIndex);
    logger.info(
        `Fetching authors | filters: name=${name || "any"}, order=${order}, page=${page}, limit=${limit}`
    )
    const authors = await fetchAll(db, sql, params);
    if(!authors || authors.length==0){
        logger.warn("No authors found for the given filters");
        return res.status(204).json({msg:"No any authors in the list yet"});
    }
    logger.info(`Authors retrieved successfully | counts = ${authors.length}`)
    return res.status(200).json({
        msg:'Authors retreived sucessfully',
        data : authors,
        pagination : {
            page : page,
            limit : limit,
            count : authors.length
        }
    });
});


export const getSingleAuthor = asyncHandler(async(req,res)=>{
    let {authorId} = req.params;
    const sql = `
        SELECT 
        authors.id AS author_id,authors.name, authors.email, authors.cretated_at AS author_created_at,
        books.id AS book_id,books.title,books.isbn,books.published_year,books.created_at AS book_created_at
        FROM authors
        LEFT JOIN books ON authors.id = books.author_id AND books.deleted_at IS NULL
        WHERE authors.id = ? AND authors.deleted_at IS NULL
    `;
    logger.info(`Attempting to retrieve author and book info for author with id ${authorId}`);
    const author = await fetchAll(db, sql, [authorId]);
    if(author.length == 0 || author[0].author_id === null){
        logger.warn(`Author with id ${authorId} does not exist`)
        const error = new Error(`Author with the given id ${authorId} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    const formattedAuthor = {
        id: author[0].author_id,
        name: author[0].name,
        email: author[0].email,
        created_at: author[0].author_created_at,
        books: author
        .filter(author => author.book_id !== null)
        .map(row => ({
            id: row.book_id,
            title: row.title,
            isbn: row.isbn,
            published_year: row.published_year,
            created_at: row.book_created_at
        }))
    };
    logger.info(`Author retrieved successfully`);
    return res.status(200).json({msg:'Author retreived sucessfully', data : formattedAuthor});
});

export const deleteAuthor = asyncHandler(async(req,res)=>{
    let {authorId} = req.params;
    logger.info(`Attempting to soft delete author with id ${authorId}`);
    
    const checkSql = `SELECT * FROM authors WHERE id = ? AND deleted_at IS NULL`;
    const existing = await fetchFirst(db, checkSql, [authorId]);
    if (!existing) {
        logger.warn(`Author with id ${authorId} does not exist or is already deleted`)
        const error = new Error(`Author with the given id ${authorId} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    
    const deleteBooksSql = `UPDATE books SET deleted_at = CURRENT_TIMESTAMP WHERE author_id = ? AND deleted_at IS NULL`;
    await execute(db, deleteBooksSql, [authorId]);
    logger.info(`Soft deleted all books associated with author id ${authorId}`);
    
    const sql = `UPDATE authors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`;
    await execute(db, sql, [authorId]);
    logger.info(`Author soft deleted successfully, id : ${authorId}`);
    return res.status(200).json({msg:'Author deleted successfully'});
});

export const getDeletedAuthors = asyncHandler(async(req,res)=>{
    let {name , order , page, limit} = req.query;
    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;
    
    let sql = `
        SELECT authors.*, COUNT(books.id) AS books_count FROM authors 
        LEFT JOIN books
        ON authors.id = books.author_id AND books.deleted_at IS NOT NULL
        WHERE authors.deleted_at IS NOT NULL
    `
    const params = []
    if(name){
        sql+= ` AND authors.name LIKE ?`;
        params.push(`%${name}%`)
    };
    sql += ` GROUP BY authors.id`;
    sql += ` ORDER BY authors.deleted_at ${order}`;
    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, startIndex);
    logger.info(
        `Fetching deleted authors | filters: name=${name || "any"}, order=${order}, page=${page}, limit=${limit}`
    )
    const authors = await fetchAll(db, sql, params);
    if(!authors || authors.length==0){
        logger.warn("No deleted authors found for the given filters");
        return res.status(204).json({msg:"No any deleted authors in the list yet"});
    }
    logger.info(`Deleted authors retrieved successfully | counts = ${authors.length}`)
    return res.status(200).json({
        msg:'Deleted authors retreived sucessfully',
        data : authors,
        pagination : {
            page : page,
            limit : limit,
            count : authors.length
        }
    });
});

export const getSingleDeletedAuthor = asyncHandler(async(req,res)=>{
    let {authorId} = req.params;
    const sql = `
        SELECT 
        authors.id AS author_id,authors.name, authors.email, authors.cretated_at AS author_created_at, authors.deleted_at,
        books.id AS book_id,books.title,books.isbn,books.published_year,books.created_at AS book_created_at
        FROM authors
        LEFT JOIN books ON authors.id = books.author_id AND books.deleted_at IS NOT NULL
        WHERE authors.id = ? AND authors.deleted_at IS NOT NULL
    `;
    logger.info(`Attempting to retrieve deleted author and book info for author with id ${authorId}`);
    const author = await fetchAll(db, sql, [authorId]);
    if(author.length == 0 || author[0].author_id === null){
        logger.warn(`Deleted author with id ${authorId} does not exist`)
        const error = new Error(`Deleted author with the given id ${authorId} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    const formattedAuthor = {
        id: author[0].author_id,
        name: author[0].name,
        email: author[0].email,
        created_at: author[0].author_created_at,
        deleted_at: author[0].deleted_at,
        books: author
        .filter(author => author.book_id !== null)
        .map(row => ({
            id: row.book_id,
            title: row.title,
            isbn: row.isbn,
            published_year: row.published_year,
            created_at: row.book_created_at
        }))
    };
    logger.info(`Deleted author retrieved successfully`);
    return res.status(200).json({msg:'Deleted author retreived sucessfully', data : formattedAuthor});
});

export const restoreAuthor = asyncHandler(async(req,res)=>{
    let {authorId} = req.params;
    logger.info(`Attempting to restore author with id ${authorId}`);
    
    const checkSql = `SELECT * FROM authors WHERE id = ? AND deleted_at IS NOT NULL`;
    const existing = await fetchFirst(db, checkSql, [authorId]);
    if (!existing) {
        logger.warn(`Deleted author with id ${authorId} does not exist`)
        const error = new Error(`Deleted author with the given id ${authorId} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    
    const restoreBooksSql = `UPDATE books SET deleted_at = NULL WHERE author_id = ? AND deleted_at IS NOT NULL`;
    await execute(db, restoreBooksSql, [authorId]);
    logger.info(`Restored all books associated with author id ${authorId}`);
    
    const sql = `UPDATE authors SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL`;
    await execute(db, sql, [authorId]);
    logger.info(`Author restored successfully, id : ${authorId}`);
    return res.status(200).json({msg:'Author restored successfully'});
});