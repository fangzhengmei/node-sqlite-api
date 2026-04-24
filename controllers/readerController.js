import { asyncHandler } from "../utils/asyncWrapper.js";
import { execute, fetchAll, fetchFirst } from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createReader = asyncHandler(async(req , res) =>{
    const { name, email, phone, address } = req.body;
    logger.info(`Attempting to create reader with unique email : ${email}`);
    const checkSql = `SELECT * FROM readers WHERE email = ?`;
    const existing = await fetchFirst(db, checkSql, [email]);
    if (existing) {
        logger.warn(`Duplicate reader error : Reader with the ${email} already exists`)
        const error = new Error("Reader with this email already exists");
        error.statusCode = 409; 
        throw error;
    }
    const sql = `INSERT INTO readers(name, email, phone, address) VALUES (?,?,?,?)`;
    await execute(db, sql, [name, email, phone || null, address || null]);
    logger.info(`Reader created successfully, email : ${email} name: ${name}`);
    return res.status(200).json({msg:'Reader created successfully'})
});

export const getAllReaders = asyncHandler(async(req,res)=>{
    let {name, email, order, sort, page, limit} = req.query;
    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;
    
    let sql = `
        SELECT readers.*, 
        (SELECT COUNT(*) FROM borrow_records WHERE reader_id = readers.id) AS borrow_count 
        FROM readers
    `
    const params = [];
    const searchFields = [];
    if(name){
        searchFields.push(`readers.name LIKE ?`);
        params.push(`%${name}%`);
    };
    if(email){
        searchFields.push(`readers.email LIKE ?`);
        params.push(`%${email}%`);
    };
    if(searchFields.length>0){
        sql+= ` WHERE ` + searchFields.join(' AND ');
    }
    const sortBy = ["name", "email", "created_at"];
    if (sort && sortBy.includes(sort)) {
        sql += ` ORDER BY ${sort} ${order}`;
    } else {
        sql += ` ORDER BY created_at ${order}`;
    }
    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, startIndex);
    logger.info(
        `Fetching readers | filters: name=${name || "any"}, email=${email || "any"}, order=${order}, page=${page}, limit=${limit}`
    )
    const readers = await fetchAll(db, sql, params);
    if(!readers || readers.length==0){
        logger.warn("No readers found for the given filters");
        return res.status(204).json({msg:"No any readers in the list yet"});
    }
    logger.info(`Readers retrieved successfully | counts = ${readers.length}`)
    return res.status(200).json({
        msg:'Readers retreived sucessfully',
        data : readers,
        pagination : {
            page : page,
            limit : limit,
            count : readers.length
        }
    });
});

export const getSingleReader = asyncHandler(async(req,res)=>{
    let {id} = req.params;
    const sql = `
        SELECT 
        readers.id AS reader_id, readers.name, readers.email, readers.phone, readers.address, readers.created_at AS reader_created_at,
        borrow_records.id AS borrow_id, borrow_records.book_id, borrow_records.borrow_date, borrow_records.due_date, 
        borrow_records.return_date, borrow_records.status AS borrow_status,
        books.title AS book_title, books.isbn AS book_isbn
        FROM readers
        LEFT JOIN borrow_records ON readers.id = borrow_records.reader_id
        LEFT JOIN books ON borrow_records.book_id = books.id
        WHERE readers.id = ?
    `;
    logger.info(`Attempting to retrieve reader with id ${id}`);
    const reader = await fetchAll(db, sql, [id]);
    if(reader.length == 0){
        logger.warn(`Reader with id ${id} does not exist`)
        const error = new Error(`Reader with the given id ${id} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    const formattedReader = {
        id: reader[0].reader_id,
        name: reader[0].name,
        email: reader[0].email,
        phone: reader[0].phone,
        address: reader[0].address,
        created_at: reader[0].reader_created_at,
        borrow_records: reader
        .filter(r => r.borrow_id !== null)
        .map(row => ({
            id: row.borrow_id,
            book_id: row.book_id,
            book_title: row.book_title,
            book_isbn: row.book_isbn,
            borrow_date: row.borrow_date,
            due_date: row.due_date,
            return_date: row.return_date,
            status: row.borrow_status
        }))
    };
    logger.info(`Reader retrieved successfully`);
    return res.status(200).json({msg:'Reader retreived sucessfully', data : formattedReader});
});

export const updateReader = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { name, email, phone, address } = req.body;
    if (!name && !email && !phone && !address) {
        logger.warn(`At least one of the fields must be provided for updation`)
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }
    const findReaderSQL = `
        SELECT * FROM readers
        WHERE id = ?
    ` 
    logger.info(`Attempting to retrive the reader to be updated`);
    const foundReader = await fetchFirst(db, findReaderSQL, [id]);
    if(!foundReader){
        logger.warn(`Reader with id ${id} does not exist in the readers table`)
        const error = new Error(`No such reader with id ${id} exists in the readers table`);
        error.statusCode = 404; 
        throw error;
    } 
    let updateSQL = 'UPDATE readers'
    const params = []
    const searchFields = []
    if (name) {
        searchFields.push(`name = ?`);
        params.push(`${name}`);
    }
    if(email){
        const findDuplicateSQL = `
            SELECT * FROM readers
            WHERE email = ?
        ` 
        const duplicateReader = await fetchFirst(db, findDuplicateSQL, [email]);
        if(duplicateReader && duplicateReader.id !== parseInt(id)){
            logger.warn(`Reader with the same email ${email} already exists`);
            const error = new Error("Reader with this email already exists");
            error.statusCode = 409; 
            throw error;
        }
        searchFields.push(`email = ?`)
        params.push(`${email}`);
    }
    if(phone !== undefined){
        searchFields.push(`phone = ?`)
        params.push(phone || null);
    }
    if(address !== undefined){
        searchFields.push(`address = ?`)
        params.push(address || null);
    }
    if(searchFields.length>0){
        updateSQL += ` SET ` + searchFields.join(', ');
    }
    updateSQL += ` WHERE id = ?`
    params.push(id); 
    logger.info(
        `Updating reader | update fields : name=${name || "any"}, email = ${email || "any"}, phone=${phone || "any"}, address=${address || "any"}`
    )
    await execute(db, updateSQL, params) ;
    logger.info(`Reader updated successfully`);
    return res.status(200).json({msg:'Reader updated successfully'});
})

export const deleteReader = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const findReaderSQL = `SELECT * FROM readers WHERE id = ?`;
    logger.info(`Attempting to delete reader with id ${id}`);
    const foundReader = await fetchFirst(db, findReaderSQL, [id]);
    if(!foundReader){
        logger.warn(`Reader with id ${id} does not exist`)
        const error = new Error(`No such reader with id ${id} exists`);
        error.statusCode = 404; 
        throw error;
    }
    const checkBorrowsSQL = `SELECT * FROM borrow_records WHERE reader_id = ? AND status = 'borrowed'`;
    const activeBorrows = await fetchAll(db, checkBorrowsSQL, [id]);
    if(activeBorrows && activeBorrows.length > 0){
        logger.warn(`Reader with id ${id} has active borrow records`);
        const error = new Error("Cannot delete reader with active borrow records. Please return all books first.");
        error.statusCode = 400;
        throw error;
    }
    const deleteSQL = `DELETE FROM readers WHERE id = ?`;
    await execute(db, deleteSQL, [id]);
    logger.info(`Reader deleted successfully`);
    return res.status(200).json({msg:'Reader deleted successfully'});
})
