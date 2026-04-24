import db from "../config/connDB.js";
import { logger } from "../logger/logger.js";

const migrateBorrowRecordsForeignKeys = async () => {
    logger.info('Starting migration: Update borrow_records foreign keys to ON DELETE SET NULL');
    
    try {
        await new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    db.run('PRAGMA foreign_keys = OFF;');
                    
                    db.run(`
                        CREATE TABLE IF NOT EXISTS borrow_records_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            reader_id INTEGER,
                            book_id INTEGER,
                            borrow_date TEXT DEFAULT CURRENT_TIMESTAMP,
                            due_date TEXT NOT NULL,
                            return_date TEXT,
                            status TEXT DEFAULT 'borrowed',
                            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL,
                            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
                        )
                    `);
                    
                    db.run(`
                        INSERT INTO borrow_records_new 
                        SELECT id, reader_id, book_id, borrow_date, due_date, return_date, status, created_at, updated_at 
                        FROM borrow_records
                    `);
                    
                    db.run(`DROP TABLE borrow_records`);
                    
                    db.run(`ALTER TABLE borrow_records_new RENAME TO borrow_records`);
                    
                    db.run('PRAGMA foreign_keys = ON;', (err) => {
                        if (err) {
                            logger.error('Failed to re-enable foreign keys after migration:', err);
                            reject(err);
                        } else {
                            logger.info('Migration completed successfully: borrow_records foreign keys updated to ON DELETE SET NULL');
                            resolve();
                        }
                    });
                } catch (err) {
                    logger.error('Migration failed:', err);
                    reject(err);
                }
            });
        });
    } catch (err) {
        logger.error('Migration process failed:', err);
        throw err;
    }
};

migrateBorrowRecordsForeignKeys().catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
});

export default migrateBorrowRecordsForeignKeys;
