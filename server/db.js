const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'bike_user',
    password: 'bike_password',
    database: 'bike_training',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
