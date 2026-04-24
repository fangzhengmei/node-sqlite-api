import db from "../config/connDB.js";

db.serialize(() => {
    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('文学小说', '各类小说和文学作品', NULL, 1)`, (err) => {
        if (err) console.log('Error seeding category 1:', err);
        else console.log('Category 1 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('科幻小说', '科幻题材的小说作品', 1, 1)`, (err) => {
        if (err) console.log('Error seeding category 2:', err);
        else console.log('Category 2 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('悬疑推理', '悬疑和推理题材的小说', 1, 1)`, (err) => {
        if (err) console.log('Error seeding category 3:', err);
        else console.log('Category 3 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('历史小说', '历史题材的小说作品', 1, 1)`, (err) => {
        if (err) console.log('Error seeding category 4:', err);
        else console.log('Category 4 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('技术书籍', '计算机和技术相关书籍', NULL, 1)`, (err) => {
        if (err) console.log('Error seeding category 5:', err);
        else console.log('Category 5 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('编程语言', '各类编程语言书籍', 5, 1)`, (err) => {
        if (err) console.log('Error seeding category 6:', err);
        else console.log('Category 6 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('数据库', '数据库相关技术书籍', 5, 1)`, (err) => {
        if (err) console.log('Error seeding category 7:', err);
        else console.log('Category 7 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('网络安全', '网络和信息安全书籍', 5, 1)`, (err) => {
        if (err) console.log('Error seeding category 8:', err);
        else console.log('Category 8 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('教育读物', '教育和学习相关书籍', NULL, 1)`, (err) => {
        if (err) console.log('Error seeding category 9:', err);
        else console.log('Category 9 seeded into the db');
    });

    db.run(`INSERT OR IGNORE INTO categories (name, description, parent_id, is_active) VALUES ('儿童读物', '适合儿童阅读的书籍', 9, 1)`, (err) => {
        if (err) console.log('Error seeding category 10:', err);
        else console.log('Category 10 seeded into the db');
    });
});
