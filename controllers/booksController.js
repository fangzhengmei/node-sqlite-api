import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchFirst, fetchAll} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';

export const createBooks = asyncHandler(async(req, res)=>{
    const { title, isbn , published_year, author_id } = req.body;
    const checksDuplicacySQL = `
        SELECT * FROM books
        WHERE isbn = ?
    `;
    const duplicate = await fetchFirst(db, checksDuplicacySQL, [isbn] );
    if(duplicate){
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
        const error = new Error(`No such author with id ${author_id} exists in the author table`);
        error.statusCode = 400; 
        throw error;
    }
    const sql = `INSERT INTO books
    (title, isbn, published_year, author_id)
    VALUES
    (?,?,?,?)`
    await execute(db, sql, [title, isbn, published_year, author_id]);
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
    const books = await fetchAll(db, sql, params);
    if(!books || books.length==0){
        return res.status(204).json({msg:"No any books in the list yet"});
    }
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
    const book = await fetchFirst(db, findBookSQL, [id]);
    if(!book){
        const error = new Error(`No book with id ${id} exists in the books table`);
        error.statusCode = 404; 
        throw error;
    }
    return res.status(200).json({msg:'book retreived sucessfully', data : book});
})

export const updateBooks = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { title, isbn , published_year, author_id} = req.body;
    if (!title && !isbn && !published_year && !author_id) {
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }
    const findBookSQL = `
        SELECT * FROM books
        WHERE id = ?
    ` 
    const foundBook = await fetchFirst(db, findBookSQL, [id]);
    console.log(foundBook);
    if(!foundBook){
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
            WHERE isbn = ? AND id != ?
        ` 
        const duplicateBook = await fetchFirst(db, findDuplicateSQL, [isbn, id]);
        if(duplicateBook){
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
    params.push(id); await execute(db, updateSQL, params) ;
    return res.status(200).json({msg:'Book updated successfully'});
})