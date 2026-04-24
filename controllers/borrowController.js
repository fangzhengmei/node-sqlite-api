import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchAll, fetchFirst } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const borrowBook = asyncHandler(async(req, res)=>{
    const { reader_id, book_id, due_date } = req.body;
    logger.info(`Attempting to borrow book id: ${book_id} for reader id: ${reader_id}`);
    
    const checkReaderSQL = `SELECT * FROM readers WHERE id = ?`;
    const reader = await fetchFirst(db, checkReaderSQL, [reader_id]);
    if(!reader){
        logger.warn(`Invalid reader_id : ${reader_id} while borrowing book`);
        const error = new Error(`No such reader with id ${reader_id} exists`);
        error.statusCode = 400; 
        throw error;
    }
    
    const checkBookSQL = `SELECT * FROM books WHERE id = ?`;
    const book = await fetchFirst(db, checkBookSQL, [book_id]);
    if(!book){
        logger.warn(`Invalid book_id : ${book_id} while borrowing`);
        const error = new Error(`No such book with id ${book_id} exists`);
        error.statusCode = 400; 
        throw error;
    }
    
    const checkActiveBorrowSQL = `
        SELECT * FROM borrow_records 
        WHERE book_id = ? AND status = 'borrowed'
    `;
    const activeBorrow = await fetchFirst(db, checkActiveBorrowSQL, [book_id]);
    if(activeBorrow){
        logger.warn(`Book id ${book_id} is already borrowed`);
        const error = new Error("This book is currently borrowed by another reader");
        error.statusCode = 400;
        throw error;
    }
    
    const checkReaderMaxBorrowSQL = `
        SELECT COUNT(*) as count FROM borrow_records 
        WHERE reader_id = ? AND status = 'borrowed'
    `;
    const readerBorrowCount = await fetchFirst(db, checkReaderMaxBorrowSQL, [reader_id]);
    if(readerBorrowCount && readerBorrowCount.count >= 5){
        logger.warn(`Reader id ${reader_id} has reached maximum borrow limit`);
        const error = new Error("Reader has reached the maximum borrow limit of 5 books");
        error.statusCode = 400;
        throw error;
    }
    
    const sql = `INSERT INTO borrow_records(reader_id, book_id, due_date, status) VALUES (?,?,?,?)`;
    await execute(db, sql, [reader_id, book_id, due_date, 'borrowed']);
    logger.info(`Book borrowed successfully, book id: ${book_id}, reader id: ${reader_id}`);
    return res.status(200).json({msg:'Book borrowed successfully'});
});

export const returnBook = asyncHandler(async(req, res)=>{
    const {id} = req.params;
    logger.info(`Attempting to return book with borrow record id: ${id}`);
    
    const checkBorrowSQL = `SELECT * FROM borrow_records WHERE id = ?`;
    const borrowRecord = await fetchFirst(db, checkBorrowSQL, [id]);
    if(!borrowRecord){
        logger.warn(`Borrow record id ${id} does not exist`);
        const error = new Error(`No such borrow record with id ${id} exists`);
        error.statusCode = 404; 
        throw error;
    }
    
    if(borrowRecord.status === 'returned'){
        logger.warn(`Borrow record id ${id} is already returned`);
        const error = new Error("This book has already been returned");
        error.statusCode = 400;
        throw error;
    }
    
    const returnDate = new Date().toISOString();
    let status = 'returned';
    
    const dueDate = new Date(borrowRecord.due_date);
    const currentDate = new Date();
    if(currentDate > dueDate){
        status = 'overdue';
    }
    
    const updateSQL = `
        UPDATE borrow_records 
        SET return_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `;
    await execute(db, updateSQL, [returnDate, status, id]);
    logger.info(`Book returned successfully, borrow record id: ${id}`);
    return res.status(200).json({msg:'Book returned successfully', status});
});

export const getAllBorrowRecords = asyncHandler(async(req,res)=>{
    let {reader_id, book_id, status, order, sort, page, limit} = req.query;
    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;
    
    let sql = `
        SELECT borrow_records.*, 
        readers.name AS reader_name, readers.email AS reader_email,
        books.title AS book_title, books.isbn AS book_isbn
        FROM borrow_records
        JOIN readers ON borrow_records.reader_id = readers.id
        JOIN books ON borrow_records.book_id = books.id
    `
    const params = [];
    const searchFields = [];
    if(reader_id){
        searchFields.push(`borrow_records.reader_id = ?`);
        params.push(reader_id);
    };
    if(book_id){
        searchFields.push(`borrow_records.book_id = ?`);
        params.push(book_id);
    };
    if(status){
        searchFields.push(`borrow_records.status = ?`);
        params.push(status);
    };
    if(searchFields.length>0){
        sql+= ` WHERE ` + searchFields.join(' AND ');
    }
    const sortBy = ["borrow_date", "due_date", "return_date", "status", "created_at"];
    if (sort && sortBy.includes(sort)) {
        sql += ` ORDER BY ${sort} ${order}`;
    } else {
        sql += ` ORDER BY created_at ${order}`;
    }
    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, startIndex);
    logger.info(
        `Fetching borrow records | filters: reader_id=${reader_id || "any"}, book_id=${book_id || "any"}, status=${status || "any"}, page=${page}, limit=${limit}`
    )
    const records = await fetchAll(db, sql, params);
    if(!records || records.length==0){
        logger.warn("No borrow records found for the given filters");
        return res.status(204).json({msg:"No any borrow records in the list yet"});
    }
    logger.info(`Borrow records retrieved successfully | counts = ${records.length}`)
    return res.status(200).json({
        msg:'Borrow records retreived sucessfully',
        data : records,
        pagination : {
            page : page,
            limit : limit,
            count : records.length
        }
    });
});

export const getSingleBorrowRecord = asyncHandler(async(req,res)=>{
    let {id} = req.params;
    const sql = `
        SELECT borrow_records.*, 
        readers.id AS reader_id, readers.name AS reader_name, readers.email AS reader_email, readers.phone AS reader_phone,
        books.id AS book_id, books.title AS book_title, books.isbn AS book_isbn, books.published_year
        FROM borrow_records
        JOIN readers ON borrow_records.reader_id = readers.id
        JOIN books ON borrow_records.book_id = books.id
        WHERE borrow_records.id = ?
    `;
    logger.info(`Attempting to retrieve borrow record with id ${id}`);
    const record = await fetchFirst(db, sql, [id]);
    if(!record){
        logger.warn(`Borrow record with id ${id} does not exist`)
        const error = new Error(`Borrow record with the given id ${id} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    const formattedRecord = {
        id: record.id,
        borrow_date: record.borrow_date,
        due_date: record.due_date,
        return_date: record.return_date,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
        reader: {
            id: record.reader_id,
            name: record.reader_name,
            email: record.reader_email,
            phone: record.reader_phone
        },
        book: {
            id: record.book_id,
            title: record.book_title,
            isbn: record.book_isbn,
            published_year: record.published_year
        }
    };
    logger.info(`Borrow record retrieved successfully`);
    return res.status(200).json({msg:'Borrow record retreived sucessfully', data : formattedRecord});
});
