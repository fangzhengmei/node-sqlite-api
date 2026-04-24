import db from "../config/connDB.js";
import bcrypt from 'bcryptjs';

const saltRounds = 10;
const adminPassword = 'Admin123';
const hashedPassword = bcrypt.hashSync(adminPassword, saltRounds);

db.serialize(() => {
    db.run(`
        INSERT INTO users (username, email, password, role) 
        VALUES ('admin', 'admin@example.com', ?, 'admin')
    `, [hashedPassword], (err) => {
        if (err) {
            console.log('Error seeding admin user:', err.message);
        } else {
            console.log('Admin user seeded successfully');
            console.log('Email: admin@example.com');
            console.log('Password: Admin123');
            console.log('Please change the default password after first login!');
        }
    });
});
