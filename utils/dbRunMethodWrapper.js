import { logger } from "../logger/logger.js";

export const execute = async(db , sql , params = [])=>{
    if(params && params.length > 0){
        return new Promise((resolve, reject)=>{
            db.run(sql, params, (err)=>{
                if(err) reject(err);
                resolve();
            })
        })
    }
    return new Promise((resolve,reject)=>{
        db.exec(sql, (err)=>{
            if(err) reject(err);
            resolve();
        })
    })
}

export const fetchFirst = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};

export const fetchAll = async(db, sql, params)=>{
  return new Promise((resolve, reject)=>{
    db.all(sql, params, (err,rows)=>{
      if(err) reject(err);
      resolve(rows);
    })
  })
}

export const beginTransaction = async (db) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN IMMEDIATE', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const commitTransaction = async (db) => {
  return new Promise((resolve, reject) => {
    db.run('COMMIT', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const rollbackTransaction = async (db) => {
  return new Promise((resolve, reject) => {
    db.run('ROLLBACK', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const withTransaction = async (db, callback) => {
  try {
    await beginTransaction(db);
    const result = await callback();
    await commitTransaction(db);
    return result;
  } catch (err) {
    try {
      await rollbackTransaction(db);
    } catch (rollbackErr) {
      logger.error(`Rollback failed: ${rollbackErr.message}`);
    }
    throw err;
  }
};
