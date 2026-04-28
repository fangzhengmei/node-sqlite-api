import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";
import { NotFoundError } from '../errors/AppError.js';

export const createAuthor = asyncHandler(async(req , res) =>{
    const { name , email} = req.body;
    logger.info(`Attempting to create author with unique email : ${email}`);
    
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
    logger.info(`Attempting to retrieve author and book info for author with id ${authorId}`);
    const author = await fetchAll(db, sql, [authorId]);
    if(author.length == 0){
        logger.warn(`Author with id ${authorId} does not exist`)
        throw new NotFoundError(`Author with id ${authorId} not found`);
    }
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
