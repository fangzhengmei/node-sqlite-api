import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";
import { checkAuthorPermission } from "../utils/permissionChecker.js";

export const createAuthor = asyncHandler(async(req , res) =>{
    const { name , email} = req.body;
    const userId = req.user.id;
    logger.info(`User ${req.user.username} (ID: ${userId}) attempting to create author with unique email : ${email}`);
    const checkSql = `SELECT * FROM authors WHERE email = ?`;
    const existing = await fetchFirst(db, checkSql, [email]);
    if (existing) {
        logger.warn(`Duplicate author error : Author with the ${email} already exists`)
        const error = new Error("Author with this email already exists");
        error.statusCode = 409; 
        throw error;
    }
    const sql = `INSERT INTO authors(name, email, created_by) VALUES (?,?,?)`;
    await execute(db, sql, [name, email, userId]);
    logger.info(`Author created successfully by user ${userId}, email : ${email} name: ${name}`);
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
        ON authors.id = books.author_id
    `
    const params = []
    if(name){
        sql+= ` WHERE authors.name LIKE ?`;
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
        LEFT JOIN books ON authors.id = books.author_id
        WHERE authors.id = ?
    `;
    logger.info(`Attempting to retrieve author and book info for book with id ${authorId}`);
    const author = await fetchAll(db, sql, [authorId]);
    if(author.length == 0){
        logger.warn(`Author with id ${authorId} does not exist`)
        const error = new Error(`Author with the given id ${authorId} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    console.log(author);
    const formattedAuthor = {
        id: author[0].author_id,
        name: author[0].name,
        email: author[0].email,
        created_at: author[0].author_cretated_at,
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

export const updateAuthor = asyncHandler(async(req,res)=>{
    const {authorId} = req.params;
    const { name, email } = req.body;
    
    const permissionCheck = await checkAuthorPermission(authorId, req.user);
    if (!permissionCheck.allowed) {
        if (permissionCheck.error === 'Author not found') {
            logger.warn(`Author with id ${authorId} does not exist`);
            const error = new Error(`No such author with id ${authorId} exists in the authors table`);
            error.statusCode = 404;
            throw error;
        }
        const error = new Error("Access denied. You can only modify authors you created or have admin privileges.");
        error.statusCode = 403;
        throw error;
    }

    if (!name && !email) {
        logger.warn(`At least one of the fields from name or email must be provided for updation`);
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }

    if (email) {
        const checkEmailSQL = `SELECT * FROM authors WHERE email = ? AND id != ?`;
        const existingEmail = await fetchFirst(db, checkEmailSQL, [email, authorId]);
        if (existingEmail) {
            logger.warn(`Update failed: email ${email} already exists`);
            const error = new Error("Author with this email already exists");
            error.statusCode = 409;
            throw error;
        }
    }

    let updateSQL = 'UPDATE authors';
    const params = [];
    const updateFields = [];

    if (name) {
        updateFields.push(`name = ?`);
        params.push(`${name}`);
    }
    if (email) {
        updateFields.push(`email = ?`);
        params.push(`${email}`);
    }

    updateSQL += ` SET ` + updateFields.join(', ') + ` WHERE id = ?`;
    params.push(authorId);

    logger.info(
        `User ${req.user.username} (ID: ${req.user.id}) updating author ${authorId} | update fields : name=${name || "any"}, email=${email || "any"}`
    );
    await execute(db, updateSQL, params);
    logger.info(`Author ${authorId} updated successfully by user ${req.user.id}`);
    return res.status(200).json({msg:'Author updated successfully'});
});

export const deleteAuthor = asyncHandler(async(req,res)=>{
    const {authorId} = req.params;
    
    const permissionCheck = await checkAuthorPermission(authorId, req.user);
    if (!permissionCheck.allowed) {
        if (permissionCheck.error === 'Author not found') {
            logger.warn(`Author with id ${authorId} does not exist`);
            const error = new Error(`No such author with id ${authorId} exists in the authors table`);
            error.statusCode = 404;
            throw error;
        }
        const error = new Error("Access denied. You can only delete authors you created or have admin privileges.");
        error.statusCode = 403;
        throw error;
    }

    const checkBooksSQL = `SELECT COUNT(*) as count FROM books WHERE author_id = ?`;
    const result = await fetchFirst(db, checkBooksSQL, [authorId]);
    if (result && result.count > 0) {
        logger.warn(`Cannot delete author ${authorId} because they have ${result.count} books`);
        const error = new Error(`Cannot delete author: they have ${result.count} book(s). Please delete the books first.`);
        error.statusCode = 400;
        throw error;
    }

    const deleteSQL = `DELETE FROM authors WHERE id = ?`;
    await execute(db, deleteSQL, [authorId]);
    
    logger.info(`Author ${authorId} deleted successfully by user ${req.user.username} (ID: ${req.user.id})`);
    return res.status(200).json({msg:'Author deleted successfully'});
});
