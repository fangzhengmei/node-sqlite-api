import app from './app.js';
import db from "./config/connDB.js";
import './migrations/index.js';

let server;

export const startServer = (PORT) =>{
    try{
        if (!db) {
            throw new Error("Database not initialized");
        }
        server = app.listen(PORT,()=>{
            console.log(`App is listening on PORT ${PORT}`);
            console.log(`API Documentation available at: http://localhost:${PORT}/api-docs`);
        })
    }catch(err){
        console.log('Error creating server',err);
        process.exit(1);
    }
}

