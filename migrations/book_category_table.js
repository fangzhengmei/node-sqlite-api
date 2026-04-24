import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS book_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            UNIQUE(book_id, category_id)
        )
    `,
(err) => {
    if (err) console.log(err);
    else console.log('Book categories table created');
});

db.run(`CREATE INDEX IF NOT EXISTS idx_book_categories_book_id ON book_categories(book_id)`, (err) => {
    if (err) console.log('Error creating index on book_id:', err);
});

db.run(`CREATE INDEX IF NOT EXISTS idx_book_categories_category_id ON book_categories(category_id)`, (err) => {
    if (err) console.log('Error creating index on category_id:', err);
});
