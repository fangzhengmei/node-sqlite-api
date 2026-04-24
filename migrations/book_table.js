import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            isbn TEXT UNIQUE NOT NULL,
            published_year INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (author_id) REFERENCES authors(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Books table created');
})
