const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load biến môi trường từ tệp .env
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  connectTimeout: 10000
});

module.exports = db;