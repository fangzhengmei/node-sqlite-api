import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import { buildPagination, buildOrderBy, buildWhereClause } from "../utils/queryBuilder.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createAuthor = asyncHandler(async(req , res) =>{
    const { name , email} = req.body;
    logger.info(`Attempting to create author with unique emal : ${email}`);
    const checkSql = `SELECT * FROM authors WHERE email = ?`;
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
    const {name , order , page, limit} = req.query;
    
    const pagination = buildPagination(page, limit);
    const orderBy = buildOrderBy(order);
    
    let sql = `
        SELECT authors.*, COUNT(books.id) AS books_count FROM authors 
        LEFT JOIN books
        ON authors.id = books.author_id
    `
    
    const conditions = [];
    if (name) {
        conditions.push({
            field: `authors.name LIKE ?`,
            value: `%${name}%`
        });
    }
    
    const whereClause = buildWhereClause(conditions);
    const params = [...whereClause.params];
    
    if (whereClause.whereClause) {
        sql += ` ${whereClause.whereClause}`;
    }
    
    sql += ` GROUP BY authors.id`;
    sql += ` ORDER BY books_count ${orderBy.order}`;
    sql += ` ${pagination.limitClause}`;
    params.push(...pagination.limitParams);
    
    logger.info(
        `Fetching authors | filters: name=${name || "any"}, order=${orderBy.order}, page=${pagination.page}, limit=${pagination.limit}`
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
            page : pagination.page,
            limit : pagination.limit,
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
    logger.info(`Attempting to retrieve author and book info for book with id ${id}`);
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
    logger.info(`Book retrieved successfully`);
    return res.status(200).json({msg:'Author retreived sucessfully', data : formattedAuthor});
});