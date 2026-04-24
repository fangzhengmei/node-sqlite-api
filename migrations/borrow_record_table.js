import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS borrow_records (
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
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Borrow records table created');
})
