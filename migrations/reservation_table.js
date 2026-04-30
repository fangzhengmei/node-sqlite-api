import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reader_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            queue_position INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            notified_at TEXT,
            FOREIGN KEY (reader_id) REFERENCES readers(id),
            FOREIGN KEY (book_id) REFERENCES books(id)
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Reservations table created');
})
