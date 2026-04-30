import { asyncHandler } from "../utils/asyncWrapper.js";
import {execute, fetchAll, fetchFirst} from "../utils/dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const createReader = asyncHandler(async(req , res) =>{
    const { name , email, phone} = req.body;
    logger.info(`Attempting to create reader with unique email : ${email}`);
    const checkSql = `SELECT * FROM readers WHERE email = ?`;
    const existing = await fetchFirst(db, checkSql, [email]);
    if (existing) {
        logger.warn(`Duplicate reader error : Reader with the ${email} already exists`)
        const error = new Error("Reader with this email already exists");
        error.statusCode = 409; 
        throw error;
    }
    const sql = `INSERT INTO readers(name, email, phone) VALUES (?,?,?)`;
    await execute(db, sql, [name, email, phone || null]);
    logger.info(`Reader created successfully, email : ${email} name: ${name}`);
    return res.status(200).json({msg:'Reader created successfully'})
});

export const getAllReaders = asyncHandler(async(req,res)=>{
    let {name , order , page, limit} = req.query;
    order = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const startIndex  = (page -1 ) * limit;
    
    let sql = `
        SELECT readers.*, 
        COUNT(DISTINCT borrow_records.id) AS borrow_count,
        COUNT(DISTINCT reservations.id) AS reservation_count 
        FROM readers 
        LEFT JOIN borrow_records ON readers.id = borrow_records.reader_id
        LEFT JOIN reservations ON readers.id = reservations.reader_id
    `
    const params = []
    if(name){
        sql+= ` WHERE readers.name LIKE ?`;
        params.push(`%${name}%`)
    };
    sql += ` GROUP BY readers.id`;
    sql += ` ORDER BY readers.created_at ${order}`;
    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, startIndex);
    logger.info(
        `Fetching readers | filters: name=${name || "any"}, order=${order}, page=${page}, limit=${limit}`
    )
    const readers = await fetchAll(db, sql, params);
    if(!readers || readers.length==0){
        logger.warn("No readers found for the given filters");
        return res.status(204).json({msg:"No any readers in the list yet"});
    }
    logger.info(`Readers retrieved successfully | counts = ${readers.length}`)
    return res.status(200).json({
        msg:'Readers retrieved successfully',
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
        SELECT * FROM readers WHERE id = ?
    `;
    logger.info(`Attempting to retrieve reader info for reader with id ${id}`);
    const reader = await fetchFirst(db, sql, [id]);
    if(!reader){
        logger.warn(`Reader with id ${id} does not exist`)
        const error = new Error(`Reader with the given id ${id} does not exist`);
        error.statusCode = 404; 
        throw error;
    }
    const borrowRecordsSql = `
        SELECT br.*, b.title, b.isbn 
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
        WHERE br.reader_id = ?
        ORDER BY br.borrow_date DESC
    `;
    const borrowRecords = await fetchAll(db, borrowRecordsSql, [id]);
    
    const reservationsSql = `
        SELECT r.*, b.title, b.isbn 
        FROM reservations r
        JOIN books b ON r.book_id = b.id
        WHERE r.reader_id = ? AND r.status = 'pending'
        ORDER BY r.queue_position ASC
    `;
    const reservations = await fetchAll(db, reservationsSql, [id]);
    
    const formattedReader = {
        ...reader,
        borrow_records: borrowRecords,
        pending_reservations: reservations
    };
    logger.info(`Reader retrieved successfully`);
    return res.status(200).json({msg:'Reader retrieved successfully', data : formattedReader});
});

export const updateReader = asyncHandler(async(req,res)=>{
    const {id} = req.params;
    const { name, email, phone } = req.body;
    
    if (!name && !email && !phone) {
        logger.warn(`At least one of the fields from name, email, phone must be provided for updation`)
        const error = new Error("At least one field must be provided to update");
        error.statusCode = 400;
        throw error;
    }
    
    const findReaderSQL = `SELECT * FROM readers WHERE id = ?`;
    logger.info(`Attempting to retrieve the reader to be updated`);
    const foundReader = await fetchFirst(db, findReaderSQL, [id]);
    if(!foundReader){
        logger.warn(`Reader with id ${id} does not exist in the readers table`)
        const error = new Error(`No such reader with id ${id} exists in the readers table`);
        error.statusCode = 400; 
        throw error;
    } 
    
    if(email){
        const findDuplicateSQL = `SELECT * FROM readers WHERE email = ?`;
        const duplicateReader = await fetchFirst(db, findDuplicateSQL, [email]);
        if(duplicateReader && duplicateReader.id !== parseInt(id)){
            logger.warn(`Reader with the same email ${email} already exists`);
            const error = new Error("Reader with this email already exists, update it to something else");
            error.statusCode = 409; 
            throw error;
        }
    }
    
    let updateSQL = 'UPDATE readers'
    const params = []
    const searchFields = []
    if (name) {
        searchFields.push(`name = ?`);
        params.push(`${name}`);
    }
    if(email){
        searchFields.push(`email = ?`)
        params.push(`${email}`);
    }
    if(phone !== undefined){
        searchFields.push(`phone = ?`)
        params.push(phone || null);
    }
    if(searchFields.length>0){
        updateSQL += ` SET ` + searchFields.join(', ');
    }
    updateSQL += ` WHERE id = ?`
    params.push(id); 
    
    logger.info(
        `Updating reader | update fields : name=${name || "any"}, email=${email || "any"}, phone=${phone || "any"}`
    )
    await execute(db, updateSQL, params) ;
    logger.info(`Reader updated successfully`);
    return res.status(200).json({msg:'Reader updated successfully'});
});
