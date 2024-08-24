// src/config/db.js
import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
  user: 'admin',
  password: '9W8RQuAdnZylXZAmb68P',
  database: 'blockchain'
});

export default db;