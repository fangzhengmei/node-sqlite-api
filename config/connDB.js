import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath =  path.resolve(__dirname, "../data/app.db");

fs.mkdirSync(path.dirname(dbPath), {recursive : true});

const db = new sqlite3.Database(dbPath,(err)=>{
    if (err) {
    console.error("Failed to connect to database:", err);
  } else {
    console.log("Connected to SQLite database at", dbPath);
  }
})

export default db;