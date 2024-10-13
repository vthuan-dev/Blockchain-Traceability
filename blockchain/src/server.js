    const dotenv = require('dotenv');
    const express = require('express');
    const bodyParser = require('body-parser');
    const mysql = require('mysql2/promise');
    const path = require('path');
    const multer = require('multer');
    require('./websocket');

    const bcrypt = require('bcrypt');
    const nodemailer = require('nodemailer');
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
    const session = require('express-session');

    // Thêm phần này để tích hợp Socket.io
    const http = require('http');
    const socketIo = require('socket.io');

    const cors = require('cors');
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
      cors: {
        origin: "http://localhost:3000", // Thay đổi nếu bạn chạy ở một domain khác
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    app.use(cors());
    app.use(bodyParser.json());

    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        expires: false
      }
    }));



    const db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectTimeout: 60000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const upload = multer({ storage: multer.memoryStorage() });
    const dangkyRoutes = require('./components/user/dangky')(db, upload);
    const dangnhapRoutes = require('./components/user/dangnhap')(db);
    app.use('/api', dangkyRoutes);
    app.use('/api', dangnhapRoutes);
    const { 
      s3Client, 
      web3, 
      contract, 
      uploadFile, 
      checkFileStatusWithRetry, 
      setupRoutes,
      activityUpload,
      processFiles,
      checkUserExists,
      checkProductExists,
      getProducerById,
      replacer,
      cleanKeys,
      BUCKET_NAME
    } = require('./backend.js');

  app.use((req, res, next) => {
    if (req.session.userId) {
      req.session.touch(); // Cập nhật thời gian hoạt động của session
    }
    next();
  });
  

  setupRoutes(app, db);

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });



  app.use(express.static(path.join(__dirname, 'public')));


  //route chuyển hướng lô hàng 
  app.get('/batch/:sscc', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'batch-redirect.html'));
  });


  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'trangchu.html'));
  });
  app.get('/trangcanhan.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'trangcanhan.html'));
  });
  app.get('/tieu-dung/trangcanhan.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'trangcanhan.html'));
  });


  app.get('/lo-hang.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'lo-hang.html'));
  });
  app.get('/sanpham.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tieu-dung', 'sanpham.html'));
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

  // xac thuc dang nhap
  function requireAuth(req, res, next) {
    if (req.session.userId) {
      next();
    } else {
      res.redirect('/account/dangnhap.html');
    }
  }

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




    // app.get('/', (req, res) => {
    //   res.sendFile(path.join(__dirname, 'public', 'trangchu.html'));
    // });

    // app.post('/api/dangnhap', async (req, res) => {
    //   const { email, password } = req.body;
    //   // ... xác thực người dùng ...
    //   if (user && await bcrypt.compare(password, user.password)) {
    //     req.session.userId = user.uid;
    //   }
    //   // ...
    // });
    // app.get('/api/products', async (req, res) => {
    //   try {
    //       const [products] = await db.query('SELECT product_id, product_name FROM products');
    //       res.json(products);
    //   } catch (error) {
    //       console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    //       res.status(500).json({ error: 'Lỗi server khi lấy danh sách sản phẩm' });
    //   }
    // });

    // app.get('/api/nhasanxuat', async (req, res) => {
    //   try {
    //     const [rows] = await db.query('SELECT * FROM users WHERE role_id = 1');
    //     res.json(rows);
    //   } catch (err) {
    //     console.error('Lỗi khi lấy danh sách nhà sản xuất:', err.message);
    //     res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà sản xuất' });
    //   }
    // });

    // app.get('/api/nhakiemduyet', async (req, res) => {
    //   try {
    //     const [rows] = await db.query('SELECT * FROM users WHERE role_id = 2');
    //     res.json(rows);
    //   } catch (err) {
    //     console.error('Lỗi khi lấy danh sách nhà kiểm duyệt:', err.message);
    //     res.status(500).json({ error: 'Lỗi khi lấy danh sách nhà kiểm duyệt' });
    //   }
    // });


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

    app.get('/kiem-duyet/nhakiemduyet.html', requireAuth, (req, res) => {
      if (req.session.roleId === 2) {
        res.sendFile(path.join(__dirname, 'public', 'kiem-duyet', 'nhakiemduyet.html'));
      } else {
        res.status(403).send('Forbidden');
      }
    });

    app.get('/user-info', (req, res) => {
      console.log('Session trong /api/user-info:', req.session);
      if (req.session && req.session.isLoggedIn) {
        if (req.session.adminId) {
          // Trả về thông tin admin nếu có adminId trong session
          res.json({
            userId: req.session.adminId,
            name: req.session.adminName,
            email: req.session.adminEmail,
            roleId: req.session.roleId,
            isAdmin: true,
            province_id: req.session.province_id
          });
        } else if (req.session.userId) {
          // Trả về thông tin user nếu có userId trong session
          res.json({
            userId: req.session.userId,
            name: req.session.name,
            email: req.session.email,
            roleId: req.session.roleId,
            isAdmin: false,
            province_id: req.session.province_id,
            region_id: req.session.region_id,
            region: req.session.region
          });
        } else {
          res.status(400).json({ error: 'Trạng thái đăng nhập không hợp lệ' });
        }
      } else {
        // Trả về thông tin người dùng ẩn danh nếu không đăng nhập
        res.json({
          name: "Người dùng ẩn danh",
          roleId: 0,
          isAdmin: false
        });
      }
    });


    app.post('/api/dangxuat', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Không thể đăng xuất' });
            }
            res.clearCookie('connect.sid'); // Xóa cookie session
            res.json({ message: 'Đăng xuất thành công' });
        });
    });
    //console.log('Các route đã đăng ký:', app._router.stack.filter(r => r.route).map(r => r.route.path));

    const manageRoutes = require('./manage.js');
    app.use('/', manageRoutes);

    const { sendNotification } = require('./notification.js');

    // Thêm clientId vào thông báo
    app.post('/api/notifications/:id/read', async (req, res) => {
      try {
        const notificationId = req.params.id;
        console.log('Đang xóa thông báo với ID:', notificationId);
        const [result] = await db.query('DELETE FROM notification WHERE id = ?', [notificationId]);
        console.log('Kết quả xóa:', result);
        if (result.affectedRows > 0) {
          res.status(200).json({ message: 'Thông báo đã được xóa' });
        } else {
          res.status(404).json({ error: 'Không tìm thấy thông báo' });
        }
      } catch (error) {
        console.error('Lỗi khi xóa thông báo:', error);
        res.status(500).json({ error: 'Lỗi server khi xóa thông báo' });
      }
    });

    const { saveNotification } = require('./notification');

    app.get('/api/notifications', async (req, res) => {
      console.log('Session adminId:', req.session.adminId);  // Log giá trị userId
      try {
        const [notifications] = await db.query(`
          SELECT n.id AS notification_id, r.content AS message, r.created_on, nt.name AS notification_type
          FROM notification n
          JOIN notification_object no ON n.notification_object_id = no.id
          JOIN register r ON no.entity_id = r.id
          JOIN notification_type nt ON no.entity_type_id = nt.id
          WHERE n.recipient_type = 'admin' AND n.admin_id = ?
          ORDER BY r.created_on DESC
        `, [req.session.adminId]);
    
        res.json(notifications);
      } catch (error) {
        console.error('Lỗi khi lấy thông báo:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy thông báo' });
      }
    });

    app.post('/api/notifications/mark-all-read', async (req, res) => {
      try {
        await db.query('DELETE FROM notification WHERE recipient_type = "admin" AND admin_id = ?', [req.session.adminId]);
        res.status(200).json({ message: 'Tất cả thông báo đã được xóa' });
      } catch (error) {
        console.error('Lỗi khi xóa tất cả thông báo:', error);
        res.status(500).json({ error: 'Lỗi server khi xóa tất cả thông báo' });
      }
    });

// Thiết lập Socket.io cho Chatbox
let users = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  function updateUnreadCountForAllAdmins() {
    const unreadCount = users.filter(user => user.unread).length;
    const admins = users.filter(user => user.roleId === 3 && user.online);
    admins.forEach(admin => {
        io.to(admin.socketId).emit("updateUnreadCount", unreadCount);
    });
}

function updateUserLastActiveTime(userName) {
  const userIndex = users.findIndex(user => user.name === userName);
  if (userIndex !== -1) {
      users[userIndex].lastActiveTime = new Date().getTime();
  }
}

  socket.on('requestUserList', () => {
    const clientUsers = users.filter(user => user.messages && user.messages.length > 0).map(user => ({
      name: user.name,
      online: user.online,
      roleId: user.roleId,
      unread: user.unread
    }));
    socket.emit('updateUserList', clientUsers);
  });

  

  socket.on('updateNewCount', (count) => {
    console.log("Received updateNewCount from client:", count);
    const admins = users.filter((x) => x.roleId === 3 && x.online);
    admins.forEach((admin) => {
        console.log(`Sending updateUnreadCount (${count}) to admin: ${admin.name}`);
        io.to(admin.socketId).emit("updateUnreadCount", count);
    });
  });

socket.on('onLogin', (user) => {
  const existingUser = users.find((x) => x.name === user.name);
  if (existingUser) {
      existingUser.online = true;
      existingUser.socketId = socket.id;  // Cập nhật socketId mới khi người dùng chuyển trang
  } else {
      users.push({
          ...user,
          online: true,
          socketId: socket.id,
          messages: [],
          unread: false,
      });
  }
  
  const admins = users.filter((x) => x.roleId === 3 && x.online);
  admins.forEach((admin) => {
      io.to(admin.socketId).emit("updateUserList", users.filter(u => u.roleId !== 3 && u.messages.length > 0));
  });
});


  socket.on('onMessage', (message) => {
    if (message.from === "Admin") {
      const user = users.find((x) => x.name === message.to);
      if (user) {
        io.to(user.socketId).emit("message", message);
        user.messages.push(message);
        user.unread = false;
        const admins = users.filter((x) => x.roleId === 3 && x.online);
        admins.forEach((admin) => {
          io.to(admin.socketId).emit("updateUser", user);
        });
      } else {
        io.to(socket.id).emit("message", {
          from: "System",
          to: "Admin",
          body: "User not found",
        });
      }
    } else {
      const admins = users.filter((x) => x.roleId === 3 && x.online);
      if (admins.length > 0) {
        let user = users.find((x) => x.name === message.from);
        if (!user) {
          user = {
            name: message.from,
            online: true,
            socketId: socket.id,
            messages: [],
            unread: true,
            roleId: 0
          };
          users.push(user);
        }
        user.messages.push(message);
        user.unread = true;
        user.online = true;
        updateUnreadCountForAllAdmins();
        updateUserLastActiveTime(message.from);
        admins.forEach((admin) => {
          io.to(admin.socketId).emit("message", message);
          io.to(admin.socketId).emit("updateUserList", users.filter(u => u.roleId !== 3 && u.messages.length > 0));
        });
      } else {
        io.to(socket.id).emit("message", {
          from: "Hệ thống",
          to: message.from,
          body: "Xin lỗi. Không có admin nào đang online",
        });
      }
    }
  });
  
  socket.on("onUserSelected", (user) => {
    const existUser = users.find((x) => x.name === user.name);
    if (existUser) {
      existUser.unread = false;
      updateUnreadCountForAllAdmins();
      updateUserLastActiveTime(user.name);
      const admins = users.filter((x) => x.roleId === 3 && x.online);
      admins.forEach((admin) => {
        io.to(admin.socketId).emit("updateUser", existUser);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userIndex = users.findIndex((x) => x.socketId === socket.id);
    if (userIndex !== -1) {
      users[userIndex].online = false;
      updateUnreadCountForAllAdmins();
      const admins = users.filter((x) => x.roleId === 3 && x.online);
      admins.forEach((admin) => {
        io.to(admin.socketId).emit("updateUserList", users.filter(u => u.roleId !== 3 && u.messages.length > 0));
      });
    }
  });

    socket.on("updateLastActiveTime", (userName) => {
      updateUserLastActiveTime(userName);
  });
});



server.listen(3000, () => {
  console.log('Server đang chạy trên cổng 3000');
});
    