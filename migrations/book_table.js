import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            isbn TEXT UNIQUE NOT NULL,
            published_year INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            status TEXT DEFAULT 'available' NOT NULL,
            total_copies INTEGER DEFAULT 1 NOT NULL,
            available_copies INTEGER DEFAULT 1 NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES authors(id)
        )
    `,
(err)=>{
    if(err) console.log(err);
    else console.log('Books table created');
});

db.run(`
    CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        checkout_date TEXT DEFAULT CURRENT_TIMESTAMP,
        due_date TEXT NOT NULL,
        return_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
    )
`, (err)=>{
    if(err) console.log(err);
    else console.log('Loans table created');
});

db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        reservation_date TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        activated_at TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
    )
`, (err)=>{
    if(err) console.log(err);
    else console.log('Reservations table created');
});

db.run(`
    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        event TEXT NOT NULL,
        user_id INTEGER,
        loan_id INTEGER,
        reservation_id INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
    )
`, (err)=>{
    if(err) console.log(err);
    else console.log('Status history table created');
});
