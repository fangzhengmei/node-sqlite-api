import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS readers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Readers table created');
})
