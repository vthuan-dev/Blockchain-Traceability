const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const dangkyRoutes = require('./components/user/dangky.js');
const dangnhapRoutes = require('./components/user/dangnhap.js');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

dotenv.config();
const app = express();
app.use(bodyParser.json());


const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000
});

app.use('/api', dangkyRoutes(db));
app.use('/api', dangnhapRoutes(db));


const { 
  s3Client, 
  web3, 
  contract, 
  uploadFile, 
  checkFileStatusWithRetry, 
  setupRoutes,
  upload,
  activityUpload,
  processFiles,
  checkUserExists,
  checkProductExists,
  getProducerById,
  replacer,
  cleanKeys,
  BUCKET_NAME
} = require('./test.js');

// ... (phần code khác giữ nguyên)

setupRoutes(app, db);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});



app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trangchu.html'));
});

//app.post('/api/register', upload.single('avatar'), (req, res) => {
  // Xử lý logic đăng ký ở đây
//});

app.post('/api/dangnhap', (req, res) => {
  const { email, password } = req.body;
  // Xử lý logic đăng nhập ở đây
});

app.get('/api/nhasanxuat', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE role_id = 2');
    res.json(rows);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách nhà sản xuất:', err.message);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà sản xuất' });
  }
});

app.get('/api/nhakiemduyet', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE role_id = 1');
    res.json(rows);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách nhà kiểm duyệt:', err.message);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà kiểm duyệt' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('Server đang chạy trên cổng 3000');
});