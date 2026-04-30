import db from "../config/connDB.js";

db.run(`
    ALTER TABLE authors ADD COLUMN deleted_at TEXT
`, (err) => {
    if (err) {
        if (err.message.includes("duplicate column name")) {
            console.log('deleted_at column already exists in authors table');
        } else {
            console.log(err);
        }
    } else {
        console.log('Added deleted_at column to authors table');
    }
});
