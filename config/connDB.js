import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const dbPath =  path.resolve(__dirname, "../data/app.db");

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
        
        dbInstance = new sqlite3.Database(dbPath,(err)=>{
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