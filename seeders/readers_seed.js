import db from "../config/connDB.js";

db.serialize(()=>{
    db.run(`INSERT INTO readers (name, email, phone, address) VALUES ('张三', 'zhangsan@example.com', '13800138001', '北京市朝阳区')`, (err)=>{
        if(err){
            console.log('Error seeding reader 1');
        }else{
            console.log('Reader 1 seeded into the db');
        }
    });
    db.run(`INSERT INTO readers (name, email, phone, address) VALUES ('李四', 'lisi@example.com', '13800138002', '上海市浦东新区')`, (err)=>{
        if(err){
            console.log('Error seeding reader 2');
        }else{
            console.log('Reader 2 seeded into the db');
        }
    });
    db.run(`INSERT INTO readers (name, email, phone, address) VALUES ('王五', 'wangwu@example.com', '13800138003', '广州市天河区')`, (err)=>{
        if(err){
            console.log('Error seeding reader 3');
        }else{
            console.log('Reader 3 seeded into the db');
        }
    });
})
