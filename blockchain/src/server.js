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
    host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
    user: 'admin',
    password: '9W8RQuAdnZylXZAmb68P',
    database: 'blockchain',
    connectTimeout: 10000
});

app.use('/api', dangkyRoutes(db));
app.use('/api', dangnhapRoutes(db));

const upload = multer();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trangchu.html'));
});

app.post('/api/register', upload.single('avatar'), (req, res) => {
  // Xử lý logic đăng ký ở đây
});

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