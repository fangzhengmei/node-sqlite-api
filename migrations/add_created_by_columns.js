import db from "../config/connDB.js";

db.serialize(() => {
    db.run(`
        ALTER TABLE authors ADD COLUMN created_by INTEGER
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column created_by already exists in authors table');
            } else {
                console.log('Error adding created_by column to authors:', err.message);
            }
        } else {
            console.log('Added created_by column to authors table');
        }
    });

    db.run(`
        ALTER TABLE books ADD COLUMN created_by INTEGER
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column created_by already exists in books table');
            } else {
                console.log('Error adding created_by column to books:', err.message);
            }
        } else {
            console.log('Added created_by column to books table');
        }
    });
});
