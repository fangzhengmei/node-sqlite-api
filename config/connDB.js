import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const dbPath =  path.resolve(__dirname, "../data/app.db");

function createMockDb() {
  const mockDatabase = {
    run: function(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) callback(null);
      return mockDatabase;
    },
    get: function(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) callback(null, null);
      return mockDatabase;
    },
    all: function(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) callback(null, []);
      return mockDatabase;
    },
    close: function(callback) {
      if (callback) callback(null);
      return mockDatabase;
    }
  };
  return mockDatabase;
}

let dbInstance = null;

try {
  const sqlite3 = require('sqlite3');
  
  fs.mkdirSync(path.dirname(dbPath), {recursive : true});
  dbInstance = new sqlite3.Database(dbPath,(err)=>{
    if (err) {
      console.error("Failed to connect to database:", err);
    } else {
      console.log("Connected to SQLite database at", dbPath);
    }
  });
} catch (err) {
  console.warn("Failed to load sqlite3, using mock database:", err.message);
  dbInstance = createMockDb();
}

export default dbInstance;
