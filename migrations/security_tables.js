import db from "../config/connDB.js";

db.serialize(() => {
    db.run(`
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0
    `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Error adding failed_login_attempts:', err.message);
        } else if (!err) {
            console.log('Added failed_login_attempts column to users table');
        }
    });

    db.run(`
        ALTER TABLE users ADD COLUMN locked_until TEXT
    `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Error adding locked_until:', err.message);
        } else if (!err) {
            console.log('Added locked_until column to users table');
        }
    });

    db.run(`
        ALTER TABLE users ADD COLUMN last_login_at TEXT
    `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Error adding last_login_at:', err.message);
        } else if (!err) {
            console.log('Added last_login_at column to users table');
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            email TEXT,
            success INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.log('Error creating login_attempts:', err.message);
        else console.log('Created login_attempts table');
    });

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at)
    `, (err) => {
        if (err) console.log('Error creating index on login_attempts:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_jti TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) console.log('Error creating token_blacklist:', err.message);
        else console.log('Created token_blacklist table');
    });

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti)
    `, (err) => {
        if (err) console.log('Error creating index on token_blacklist:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            jti TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) console.log('Error creating refresh_tokens:', err.message);
        else console.log('Created refresh_tokens table');
    });

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)
    `, (err) => {
        if (err) console.log('Error creating index on refresh_tokens:', err.message);
    });

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti)
    `, (err) => {
        if (err) console.log('Error creating index on refresh_tokens jti:', err.message);
    });

    console.log('Security tables migration completed');
});
