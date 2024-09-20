const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const session = require('express-session');

const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
  }
}));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000
});
const dangkyRoutes = require('./components/user/dangky')(db);
const dangnhapRoutes = require('./components/user/dangnhap')(db);
app.use('/api', dangkyRoutes);
app.use('/api', dangnhapRoutes);

app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.touch(); // Cập nhật thời gian hoạt động của session
  }
  next();
});
app.use((req, res, next) => {
  if (!req.session.userId) {
    console.log('No userId in session');
  }
  next();
});

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
} = require('./backend.js');

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

app.post('/api/dangnhap', async (req, res) => {
  const { email, password } = req.body;
  // ... xác thực người dùng ...
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.uid;
    // ... các xử lý khác ...
  }
  // ...
});
app.get('/api/products', async (req, res) => {
  try {
      const [products] = await db.query('SELECT product_id, product_name FROM products');
      res.json(products);
  } catch (error) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', error);
      res.status(500).json({ error: 'Lỗi server khi lấy danh sách sản phẩm' });
  }
});

app.get('/api/nhasanxuat', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE role_id = 1');
    res.json(rows);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách nhà sản xuất:', err.message);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà sản xuất' });
  }
});

app.get('/api/nhakiemduyet', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE role_id = 2');
    res.json(rows);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách nhà kiểm duyệt:', err.message);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà kiểm duyệt' });
  }
});

app.get('/nha-kho/nha-kho.html', requireAuth, (req, res) => {
  if (req.session.roleId === 8) {
    res.sendFile(path.join(__dirname, 'public', 'nha-kho', 'nha-kho.html'));
  } else {
    res.status(403).send('Forbidden');
  }
});
app.get('/van-chuyen/van-chuyen.html', requireAuth, (req, res) => {
  if (req.session.roleId === 6) {
    res.sendFile(path.join(__dirname, 'public', 'van-chuyen', 'van-chuyen.html'));
  } else {
    res.status(403).send('Forbidden');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// xac thuc dang nhap
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Sử dụng middleware cho các route cần xác thực
app.get('/san-xuat/sanxuat.html', requireAuth, (req, res) => {
  if (req.session.roleId === 1) {
    res.sendFile(path.join(__dirname, 'public', 'san-xuat', 'sanxuat.html'));
  } else {
    res.status(403).send('Forbidden');
  }
});

app.get('/nhakiemduyet.html', requireAuth, (req, res) => {
  if (req.session.roleId === 2) {
    res.sendFile(path.join(__dirname, 'public', 'kiem-duyet', 'nhakiemduyet.html'));
  } else {
    res.status(403).send('Forbidden');
  }
});


app.get('/api/user-info', async (req, res) => { 
  if (req.session.userId) {
    try {
      const [users] = await db.query(`
        SELECT u.uid, u.name, u.email, r.role_name, reg.region_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        JOIN regions reg ON u.region_id = reg.region_id 
        WHERE u.uid = ?
      `, [req.session.userId]);
      
      const user = users[0];
      if (user) {
        res.json({
          id: user.uid,  // Đảm bảo trả về ID người dùng
          name: user.name,
          email: user.email,
          role: user.role_name,
          region: user.region_name
        });
      } else {
        res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  } else {
    res.status(401).json({ message: 'Chưa đăng nhập' });
  }
});

app.post('/api/dangxuat', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Không thể đăng xuất' });
        }
        res.json({ message: 'Đăng xuất thành công' });
    });
});
console.log('Các route đã đăng ký:', app._router.stack.filter(r => r.route).map(r => r.route.path));


const manageRoutes = require('./manage.js');
app.use('/', manageRoutes);

app.listen(3000, () => {
  console.log('Server đang chạy trên cổng 3000');
});