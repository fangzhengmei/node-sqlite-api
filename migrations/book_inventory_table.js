import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS book_inventories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            total_quantity INTEGER NOT NULL DEFAULT 1,
            available_quantity INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id),
            UNIQUE(book_id)
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Book inventories table created');
})
