import db from "../config/connDB.js";

db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            parent_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    `,
(err) => {
    if (err) console.log(err);
    else console.log('Categories table created');
});

db.run(`CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)`, (err) => {
    if (err) console.log('Error creating index on parent_id:', err);
});

db.run(`CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active)`, (err) => {
    if (err) console.log('Error creating index on is_active:', err);
});
