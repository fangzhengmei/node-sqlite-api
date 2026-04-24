import { fetchFirst } from "./dbRunMethodWrapper.js";
import db from '../config/connDB.js';
import { logger } from "../logger/logger.js";

export const canModifyResource = (user, resource) => {
    if (!user) return false;
    
    if (user.role === 'admin') {
        return true;
    }
    
    if (resource.created_by === null || resource.created_by === undefined) {
        return false;
    }
    
    return resource.created_by === user.id;
};

export const checkBookPermission = async (bookId, user) => {
    const findBookSQL = `SELECT * FROM books WHERE id = ?`;
    const book = await fetchFirst(db, findBookSQL, [bookId]);
    
    if (!book) {
        return { allowed: false, book: null, error: 'Book not found' };
    }
    
    const allowed = canModifyResource(user, book);
    
    if (!allowed) {
        logger.warn(`User ${user.username} (ID: ${user.id}) attempted to modify book ${bookId} without permission`);
    }
    
    return { allowed, book, error: null };
};

export const checkAuthorPermission = async (authorId, user) => {
    const findAuthorSQL = `SELECT * FROM authors WHERE id = ?`;
    const author = await fetchFirst(db, findAuthorSQL, [authorId]);
    
    if (!author) {
        return { allowed: false, author: null, error: 'Author not found' };
    }
    
    const allowed = canModifyResource(user, author);
    
    if (!allowed) {
        logger.warn(`User ${user.username} (ID: ${user.id}) attempted to modify author ${authorId} without permission`);
    }
    
    return { allowed, author, error: null };
};
