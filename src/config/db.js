var mysql = require('mysql2');
var connection = mysql.createConnection({
    host     : 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
    user     : 'admin',
    password : '9W8RQuAdnZylXZAmb68P',
    database : 'blockchain'
});

connection.connect(function(err) {
    if (err) throw err;
});

module.exports = connection;