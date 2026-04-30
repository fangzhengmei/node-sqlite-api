import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const dbPath = path.resolve(process.cwd(), "data/app.db");

const require = createRequire(path.resolve(process.cwd(), "index.js"));

let dbInstance = null;
let sqlite3 = null;
let initializationError = null;

try {
    sqlite3 = require('sqlite3');
} catch (err) {
    initializationError = err;
}

const getDb = () => {
    if (initializationError) {
        throw new Error("sqlite3 module is not available");
    }

    if (!dbInstance) {
        fs.mkdirSync(path.dirname(dbPath), {recursive : true});

        dbInstance = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("Failed to connect to database:", err);
            } else {
                console.log("Connected to SQLite database at", dbPath);
            }
        });
    }
    return dbInstance;
};

const db = new Proxy({}, {
    get(target, prop) {
        if (initializationError) {
            return () => {
                throw new Error("sqlite3 module is not available");
            };
        }

        const database = getDb();
        return typeof database[prop] === 'function'
            ? database[prop].bind(database)
            : database[prop];
    }
});

export default db;
