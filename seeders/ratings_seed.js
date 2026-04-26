import db from "../config/connDB.js";

db.serialize(()=>{
    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (1, 5, 'Amazing book! Loved every chapter.', 'Alice Smith')`, (err)=>{
        if(err){
            console.log('Error seeding rating 1:', err.message);
        }else{
            console.log('Rating 1 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (1, 4, 'Great storytelling, a bit slow at the start.', 'Bob Johnson')`, (err)=>{
        if(err){
            console.log('Error seeding rating 2:', err.message);
        }else{
            console.log('Rating 2 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (1, 5, 'A must-read for fantasy lovers!', 'Charlie Brown')`, (err)=>{
        if(err){
            console.log('Error seeding rating 3:', err.message);
        }else{
            console.log('Rating 3 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (2, 5, 'Epic fantasy world with complex characters.', 'David Wilson')`, (err)=>{
        if(err){
            console.log('Error seeding rating 4:', err.message);
        }else{
            console.log('Rating 4 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (2, 4, 'Intriguing plot twists, though some deaths were too sudden.', 'Emma Davis')`, (err)=>{
        if(err){
            console.log('Error seeding rating 5:', err.message);
        }else{
            console.log('Rating 5 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (2, 3, 'Good but too long for my taste.', 'Frank Miller')`, (err)=>{
        if(err){
            console.log('Error seeding rating 6:', err.message);
        }else{
            console.log('Rating 6 seeded into the db');
        }
    });

    db.run(`INSERT INTO ratings (book_id, rating, comment, reader_name) VALUES (2, 5, 'Best fantasy series ever written!', 'Grace Lee')`, (err)=>{
        if(err){
            console.log('Error seeding rating 7:', err.message);
        }else{
            console.log('Rating 7 seeded into the db');
        }
    });
});
