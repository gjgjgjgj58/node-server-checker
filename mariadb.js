const mysql = require('mysql');

class Mariadb {
    constructor(config) {
        this.config = config;
    }
    createPool() {
        return new Promise(resolve => {
            let pool = mysql.createPool(this.config);
            this.pool = pool;

            resolve(pool);
        });
    }
    getConnection(pool) {
        return new Promise(resolve => {
            pool.getConnection(function (err, conn) {
                if (!err) {
                    conn.end();
                    resolve(true);
                } else {
                    console.error(err);
                    conn.end();
                    resolve(false);
                }
            });
        });
    }
    end(pool) {
        return new Promise(resolve => {
            pool.end();
            resolve(pool);
        });
    }
    async execute() {
        let pool = await this.createPool();
        let result = await this.getConnection(pool);
        pool = await this.end(pool);

        if (!result)
            return false;
        else
            return true;
    }
}

module.exports = { Mariadb };