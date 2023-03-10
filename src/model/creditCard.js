const Pool = require('../config/db');

const selectAllCredit = (search, sortBY, sort, limit, offset) => {
    return Pool.query(`SELECT * FROM credit_card WHERE fullname LIKE '%${search}%' ORDER BY ${sortBY} ${sort} LIMIT ${limit} OFFSET ${offset}`);
};

const selectDetailCredit = (id_user) =>{
    return Pool.query(`SELECT * FROM credit_card WHERE id_user='${id_user}'`);
};

const insertCredit = (data) => {
    const { id, fullname, credit_number, expire, cvv, balance, id_user } = data;
    return Pool.query(`INSERT INTO credit_card(id,fullname,credit_number,expire,cvv,balance,id_user) VALUES('${id}','${fullname}','${credit_number}','${expire}','${cvv}','${balance}','${id_user}')`);
};

const updateCredit = (data) => {
    const { id, fullname, credit_number, expire, cvv, balance, id_user } = data;
    return Pool.query(`UPDATE credit_card SET fullname='${fullname}', credit_number='${credit_number}', expire='${expire}', cvv='${cvv}', balance='${balance}', id_user='${id_user}' WHERE id='${id}'`);
};

const unsetPreffered = (id_user) => {
    return Pool.query(`UPDATE credit_card SET preffered='false' WHERE id_user='${id_user}'`);
};

const setPreffered = (id) => {
    return Pool.query(`UPDATE credit_card SET preffered='true' WHERE id='${id}'`);
};

const updateBalance = (id, newBalance) => {
    return Pool.query(`UPDATE credit_card SET balance='${newBalance}' WHERE id='${id}'`);
};

const deleteCredit = (id) => {
    return Pool.query(`DELETE FROM credit_card WHERE id='${id}'`);
};

const findId = (id) => {
    return new Promise((resolve, reject) => 
        Pool.query(`SELECT id FROM credit_card WHERE id='${id}'`, (error, result) => {
            if (!error) {
                resolve(result)
            } else {
                reject(error)
            }
        })
    )
};

const findIdUser = (id_user) => {
    return new Promise((resolve, reject) => 
        Pool.query(`SELECT id FROM credit_card WHERE id_user='${id_user}'`, (error, result) => {
            if (!error) {
                resolve(result)
            } else {
                reject(error)
            }
        })
    )
};

const countData = () => {
    return Pool.query('SELECT COUNT(*) FROM credit_card')
};

module.exports = {
    selectAllCredit,
    selectDetailCredit,
    insertCredit,
    updateCredit,
    deleteCredit,
    countData,
    findId,
    findIdUser,
    unsetPreffered,
    setPreffered,
    updateBalance
}