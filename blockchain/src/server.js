const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const dangkyRoutes = require('./components/user/dangky.js');
const dangnhapRoutes = require('./components/user/dangnhap.js');
const bcrypt = require('bcrypt'); // Thêm dòng này để import bcrypt
const nodemailer = require('nodemailer'); // Thêm dòng này để import nodemailer
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });


dotenv.config();
const app = express();
app.use(bodyParser.json());


const db = mysql.createPool({
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // port: process.env.DB_PORT,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_DATABASE,
    host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
    user: 'admin',
    password: '9W8RQuAdnZylXZAmb68P',
    database: 'blockchain',
    connectTimeout: 10000
});
// db.connect((err) => {
//   if (err) {
//     console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
//     return;
//   }
//   console.log('Đã kết nối cơ sở dữ liệu');
// });

app.use('/api', dangkyRoutes(db));
app.use('/api', dangnhapRoutes(db));

const upload = multer();

// API endpoint để lấy danh sách vùng sản xuất
// app.get('/api/regions', (req, res) => {
//   const query = 'SELECT * FROM regions';
//   db.query(query, (err, results) => {
//     if (err) {
//       res.status(500).json({ error: 'Lỗi khi lấy danh sách vùng sản xuất' });
//     } else {
//       res.json(results);
//     }
//   });
// });

// API endpoint để xử lý đăng ký
app.post('/api/register', upload.single('avatar'), (req, res) => {
  // Xử lý logic đăng ký ở đây
  // Lưu thông tin người dùng vào cơ sở dữ liệu
  // Trả về kết quả cho client
});

// API endpoint để xử lý đăng nhập
app.post('/api/dangnhap', (req, res) => {
  const { email, password } = req.body;
  // Xử lý logic đăng nhập ở đây
  // Kiểm tra thông tin đăng nhập với cơ sở dữ liệu
  // Trả về kết quả cho client
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('Server đang chạy trên cổng 3000');
});