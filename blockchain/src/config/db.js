const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
    user: 'admin',
    password: '9W8RQuAdnZylXZAmb68P',
    database: 'blockchain'
});

module.exports = pool;