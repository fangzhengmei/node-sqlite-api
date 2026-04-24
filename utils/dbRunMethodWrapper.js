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

export const beginTransaction = async(db, mode = 'DEFERRED')=>{
    const modes = {
        'DEFERRED': 'BEGIN TRANSACTION',
        'IMMEDIATE': 'BEGIN IMMEDIATE TRANSACTION',
        'EXCLUSIVE': 'BEGIN EXCLUSIVE TRANSACTION'
    };
    const sql = modes[mode] || modes['DEFERRED'];
    return new Promise((resolve, reject)=>{
        db.run(sql, (err)=>{
            if(err) reject(err);
            resolve();
        })
    })
}

export const commitTransaction = async(db)=>{
    return new Promise((resolve, reject)=>{
        db.run('COMMIT', (err)=>{
            if(err) reject(err);
            resolve();
        })
    })
}

export const rollbackTransaction = async(db)=>{
    return new Promise((resolve, reject)=>{
        db.run('ROLLBACK', (err)=>{
            if(err) reject(err);
            resolve();
        })
    })
}

export const runWithTransaction = async(db, callback, mode = 'DEFERRED')=>{
    try {
        await beginTransaction(db, mode);
        const result = await callback();
        await commitTransaction(db);
        return result;
    } catch (err) {
        await rollbackTransaction(db);
        throw err;
    }
}
