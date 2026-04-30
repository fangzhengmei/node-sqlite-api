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

const beginTransaction = (db) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const commitTransaction = (db) => {
  return new Promise((resolve, reject) => {
    db.run('COMMIT', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const rollbackTransaction = (db) => {
  return new Promise((resolve, reject) => {
    db.run('ROLLBACK', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const runInTransaction = async (db, transactionFn) => {
  await beginTransaction(db);
  try {
    const result = await transactionFn();
    await commitTransaction(db);
    return result;
  } catch (err) {
    await rollbackTransaction(db);
    throw err;
  }
};

