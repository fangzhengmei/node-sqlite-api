import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS fines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borrow_record_id INTEGER NOT NULL,
            fine_amount REAL DEFAULT 0.0,
            fine_days INTEGER DEFAULT 0,
            is_paid INTEGER DEFAULT 0,
            paid_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id)
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Fines table created');
})
