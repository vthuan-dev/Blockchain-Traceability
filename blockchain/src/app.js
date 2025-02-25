const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("./websocket.js");

const {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  admin,
  adminBucket,
} = require("./firebase.js");
const { storage } = require("./firebase.js");

const { signInWithEmailAndPassword } = require("firebase/auth");

const { uploadFile: uploadFileFirebase, deleteFile } = require("./firebase.js");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Thêm phần này để tích hợp Socket.io
const http = require("http");
const socketIo = require("socket.io");

const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://blockchain-truyxuat-54cfaa613f9c.herokuapp.com/", // Tên miền Heroku của bạn
      "http://localhost:3000", 
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(bodyParser.json());

const redisClient = require('./config/redis');  // Sử dụng Redis client đã cấu hình
const session = require("express-session");  // Import express-session

// Tạo RedisStore từ connect-redis và express-session
const RedisStore = require("connect-redis").default

// Middleware để log session cho debug
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
  next();
});

// Middleware để debug
app.use((req, res, next) => {
  console.log("===== DEBUG SESSION =====");
  console.log("Session ID:", req.sessionID);
  console.log("isLoggedIn:", req.session.isLoggedIn);
  console.log("roleId:", req.session.roleId);
  console.log("Headers Cookie:", req.headers.cookie);
  next();
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const today = new Date();
    const uploadPath = path.join(
      uploadDir,
      today.getFullYear().toString(),
      (today.getMonth() + 1).toString()
    );
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const dangkyRoutes = require("./components/user/dangky.js")(db, upload);
const dangnhapRoutes = require("./components/user/dangnhap.js")(db);
app.use("/api", dangkyRoutes);
app.use("/api", dangnhapRoutes);
const {
  web3,
  contract,
  setupRoutes,
  activityUpload,
  processFiles,
  checkUserExists,
  checkProductExists,
  getProducerById,
  replacer,
  cleanKeys,
} = require("./backend.js");

app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.touch(); // Cập nhật thời gian hoạt động ca session
  }
  next();
});
app.get("/api/check-login", (req, res) => {
  console.log("Kiểm tra đăng nhập - Session:", req.session);
  res.json({ 
    isLoggedIn: req.session.isLoggedIn === true,
    roleId: req.session.roleId
  });
});

setupRoutes(app, db);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, "public")));

//route chuyển hướng lô hàng
app.get("/batch/:sscc", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "tieu-dung", "batch-redirect.html")
  );
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "trangchu.html"));
});
app.get("/trangcanhan.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "trangcanhan.html"));
});
app.get("/tieu-dung/trangcanhan.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "trangcanhan.html"));
});

app.get("/lo-hang.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "lo-hang.html"));
});
app.get("/sanpham.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "sanpham.html"));
});
app.get("/allsanpham.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "allsanpham.html"));
});
app.get("/allnongdan.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "allnongdan.html"));
});
app.get("/allnhakiemduyet.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tieu-dung", "allnhakiemduyet.html"));
});

//app.post('/api/register', upload.single('avatar'), (req, res) => {
// Xử lý logic đăng ký ở đây
//});




app.get("/api/products", async (req, res) => {
  try {
    const [products] = await db.query(
      "SELECT product_id, product_name FROM products"
    );
    res.json(products);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách sản phẩm" });
  }
});

app.get("/api/nhasanxuat", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users join roles on users.role_id = roles.role_id left join regions on users.region_id = regions.region_id WHERE users.role_id = 1");
    res.json(rows);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách nhà sản xuất:", err.message);
    res.status(500).json({ error: "Lỗi khi lấy danh sách nhà sản xuất" });
  }
});

app.get("/api/nhakiemduyet", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users join roles on users.role_id = roles.role_id left join regions on users.region_id = regions.region_id WHERE users.role_id = 2");
    res.json(rows);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách nhà kiểm duyệt:", err.message);
    res.status(500).json({ error: "Lỗi khi lấy danh sách nhà kiểm duyệt" });
  }
});

app.get("/nha-kho/nha-kho.html", requireAuth, (req, res) => {
  if (req.session.roleId === 8) {
    res.sendFile(path.join(__dirname, "public", "nha-kho", "nha-kho.html"));
  } else {
    res.status(403).send("Forbidden");
  }
});
app.get("/van-chuyen/van-chuyen.html", requireAuth, (req, res) => {
  if (req.session.roleId === 6) {
    res.sendFile(
      path.join(__dirname, "public", "van-chuyen", "van-chuyen.html")
    );
  } else {
    res.status(403).send("Forbidden");
  }
});

// xac thuc dang nhap
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/account/dangnhap.html");
  }
}

app.get("/san-xuat/sanxuat.html", requireAuth, (req, res) => {
  if (req.session.roleId === 1) {
    res.sendFile(path.join(__dirname, "public", "san-xuat", "sanxuat.html"));
  } else {
    res.status(403).send("Forbidden");
  }
});

app.get("/nhakiemduyet.html", requireAuth, (req, res) => {
  if (req.session.roleId === 2) {
    res.sendFile(
      path.join(__dirname, "public", "kiem-duyet", "nhakiemduyet.html")
    );
  } else {
    res.status(403).send("Forbidden");
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
  if (req.session.userId && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect("/account/dangnhap.html");
  }
}

// Sử dụng middleware cho các route cần xác thực
// app.get('/san-xuat/sanxuat.html', requireAuth, (req, res) => {
//   if (req.session.roleId === 1) {
//     res.sendFile(path.join(__dirname, 'public', 'san-xuat', 'sanxuat.html'));
//   } else {
//     res.status(403).send('Forbidden');
//   }
// });

// app.get('/kiem-duyet/nhakiemduyet.html', requireAuth, (req, res) => {
//   if (req.session.roleId === 2) {
//     res.sendFile(path.join(__dirname, 'public', 'kiem-duyet', 'nhakiemduyet.html'));
//   } else {
//     res.status(403).send('Forbidden');
//   }
// });

// app.get('/user-info', (req, res) => {
//   console.log('Session trong /api/user-info:', req.session);
//   if (req.session && req.session.isLoggedIn) {
//     if (req.session.adminId) {
//       // Trả về thông tin admin nếu có adminId trong session
//       res.json({
//         userId: req.session.adminId,
//         name: req.session.adminName,
//         email: req.session.adminEmail,
//         roleId: req.session.roleId,
//         isAdmin: true,
//         province_id: req.session.province_id
//       });
//     } else if (req.session.userId) {
//       // Trả về thông tin user nếu có userId trong session
//       res.json({
//         userId: req.session.userId,
//         name: req.session.name,
//         email: req.session.email,
//         roleId: req.session.roleId,
//         isAdmin: false,
//         province_id: req.session.province_id,
//         region_id: req.session.region_id,
//         region: req.session.region
//       });
//     } else {
//       res.status(400).json({ error: 'Trạng thái đăng nhập không hợp lệ' });
//     }
//   } else {
//     // Trả về thông tin người dùng ẩn danh nếu không đăng nhập
//     res.json({
//       name: "Người dùng ẩn danh",
//       roleId: 0,
//       isAdmin: false
//     });
//   }
// });

app.get("/api/address-data", async (req, res) => {
  try {
    const data = await fs.readFile(
      path.join(__dirname, "components/user/data.json"),
      "utf8"
    );
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  } catch (error) {
    console.error("Lỗi khi đọc dữ liệu từ file JSON:", error);
    res.status(500).json({ error: "Lỗi server khi đọc dữ liệu" });
  }
});

app.get("/api/region", async (req, res) => {
  const [regions] = await db.query("SELECT * FROM regions");
  res.json(regions);
});

app.put("/api/capnhatthongtin", upload.single("avatar"), async (req, res) => {
  let connection;
  let tempAvatarUrl = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
    }

    let updateFields = [];
    let updateValues = [];

    // Xử lý avatar nếu có file upload
    if (req.file) {
      try {
        // Xóa avatar cũ
        const [oldUser] = await connection.query(
          "SELECT avatar FROM users WHERE uid = ?",
          [userId]
        );

        if (oldUser[0]?.avatar) {
          if (!oldUser[0].avatar.includes('firebase')) {
            const oldAvatarPath = path.join(__dirname, 'public', 'uploads', 'avatars', path.basename(oldUser[0].avatar));
            if (fs.existsSync(oldAvatarPath)) {
              fs.unlinkSync(oldAvatarPath);
            }
          }
        }

        // Tạo tên file mới
        const fileExt = path.extname(req.file.originalname);
        const newFileName = `avatar_${userId}_${Date.now()}${fileExt}`;
        const avatarDir = path.join(__dirname, 'public', 'uploads', 'avatars');
        
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(avatarDir)) {
          fs.mkdirSync(avatarDir, { recursive: true });
        }

        // Lưu file mới - sử dụng req.file.buffer nếu có, nếu không thì dùng fs.copyFileSync
        const newFilePath = path.join(avatarDir, newFileName);
        if (req.file.buffer) {
          fs.writeFileSync(newFilePath, req.file.buffer);
        } else if (req.file.path) {
          fs.copyFileSync(req.file.path, newFilePath);
        } else {
          throw new Error('Không tìm thấy dữ liệu file');
        }

        // Cập nhật đường dẫn trong database
        tempAvatarUrl = `/uploads/avatars/${newFileName}`;
        updateFields.push("avatar = ?");
        updateValues.push(tempAvatarUrl);

      } catch (uploadError) {
        console.error("Lỗi khi xử lý avatar:", uploadError);
        throw new Error("Lỗi khi xử lý avatar");
      }
    }

    // Xử lý các trường thông tin khác nếu có
    const { name, phone, address, dob, gender, region_id } = req.body;
    const fields = { name, phone, address, dob, gender, region_id };
    
    for (const [key, value] of Object.entries(fields)) {
      if (value) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE uid = ?`;
      updateValues.push(userId);

      const [result] = await connection.query(updateQuery, updateValues);

      if (result.affectedRows === 0) {
        throw new Error("Không có hàng nào được cập nhật trong cơ sở dữ liệu");
      }

      // Cập nhật session với thông tin mới
      Object.keys(fields).forEach((key) => {
        if (fields[key]) {
          req.session[key] = fields[key];
        }
      });

      if (tempAvatarUrl) {
        req.session.avatar = tempAvatarUrl;
      }

      // Nếu có cập nhật region_id, lấy thêm tên region
      if (region_id) {
        const [regionResult] = await connection.query(
          "SELECT region_name FROM regions WHERE region_id = ?",
          [region_id]
        );
        if (regionResult[0]) {
          req.session.region = regionResult[0].region_name;
        }
      }

      // Đảm bảo session được lưu
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log("Updated Session:", req.session);

      await connection.commit();
      res.json({
        updated: true,
        message: "Thông tin đã được cập nhật thành công",
        avatarUrl: tempAvatarUrl
      });
    } else {
      res.json({
        updated: false,
        message: "Không có thông tin nào được cập nhật"
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi chi tiết khi cập nhật thông tin người dùng:", error);
    res.status(500).json({ error: error.message || "Lỗi khi cập nhật thông tin người dùng" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/dangxuat", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Không thể đăng xuất" });
    }
    res.clearCookie("connect.sid"); // Xóa cookie session
    res.json({ message: "Đăng xuất thành công" });
  });
});
//console.log('Các route đã đăng ký:', app._router.stack.filter(r => r.route).map(r => r.route.path));

const manageRoutes = require("./manage.js");
app.use("/", manageRoutes);

const { sendNotification } = require("./notification.js");

// Thêm clientId vào thông báo
app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.userId;

    console.log("Đang xóa thông báo với ID:", notificationId);
    const [result] = await db.query(
      "DELETE FROM notification WHERE id = ? AND user_id = ?",
      [notificationId, userId]
    );
    console.log("Kết quả xóa:", result);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Thông báo đã được xóa" });
    } else {
      res.status(404).json({ error: "Không tìm thấy thông báo" });
    }
  } catch (error) {
    console.error("Lỗi khi xóa thông báo:", error);
    res.status(500).json({ error: "Lỗi server khi xóa thông báo" });
  }
});

app.post("/api/notifications/:id/admin-read", async (req, res) => {
  try {
    const notificationId = req.params.id;
    const adminId = req.session.adminId;

    console.log("Đang xóa thông báo với ID:", notificationId);
    const [result] = await db.query(
      "DELETE FROM notification WHERE id = ? AND admin_id = ?",
      [notificationId, adminId]
    );
    console.log("Kết quả xóa:", result);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Thông báo đã được xóa" });
    } else {
      res.status(404).json({ error: "Không tìm thấy thông báo" });
    }
  } catch (error) {
    console.error("Lỗi khi xóa thông báo:", error);
    res.status(500).json({ error: "Lỗi server khi xóa thông báo" });
  }
});

app.post("/api/notifications/mark-all-read", async (req, res) => {
  try {
    let query;
    let params;

    if (req.session.adminId) {
      query = 'DELETE FROM notification WHERE recipient_type = "admin" AND admin_id = ?';
      params = [req.session.adminId];
    } else {
      query = 'DELETE FROM notification WHERE recipient_type = "user" AND user_id = ?';
      params = [req.session.userId];
    }

    await db.query(query, params);
    res.status(200).json({ message: "Tất cả thông báo đã được xóa" });
  } catch (error) {
    console.error("Lỗi khi xóa tất cả thông báo:", error);
    res.status(500).json({ error: "Lỗi server khi xóa tất cả thông báo" });
  }
});

// const { registerNotification } = require("./notification.js");

app.get("/api/notifications", async (req, res) => {
  console.log("Session adminId:", req.session.adminId); // Log giá trị userId
  try {
    const [notifications] = await db.query(
      `
        SELECT n.id AS notification_id, r.content AS message, r.created_on, nt.name AS notification_type
        FROM notification n
        JOIN notification_object no ON n.notification_object_id = no.id
        JOIN register r ON no.entity_id = r.id
        JOIN notification_type nt ON no.entity_type_id = nt.id
        WHERE n.recipient_type = 'admin' AND n.admin_id = ?
        ORDER BY r.created_on DESC
      `,
      [req.session.adminId]
    );

    res.json(notifications);
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
    res.status(500).json({ error: "Lỗi server khi lấy thông báo" });
  }
});

// xac thuc dang nhap
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

// Sử dụng middleware cho các route cần xác thực
app.get("/san-xuat/sanxuat.html", requireAuth, (req, res) => {
  if (req.session.roleId === 1) {
    res.sendFile(path.join(__dirname, "public", "san-xuat", "sanxuat.html"));
  } else {
    res.status(403).send("Forbidden");
  }
});

app.get("/kiem-duyet/nhakiemduyet.html", requireAuth, (req, res) => {
  if (req.session.roleId === 2) {
    res.sendFile(
      path.join(__dirname, "public", "kiem-duyet", "nhakiemduyet.html")
    );
  } else {
    res.status(403).send("Forbidden");
  }
});

app.get("/user-info", (req, res) => {
  console.log("Session trong /api/user-info:", req.session);
  if (req.session?.isLoggedIn) {
    if (req.session.adminId) {
      // Trả về thông tin admin nếu có adminId trong session
      res.json({
        userId: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        roleId: req.session.roleId,
        isAdmin: true,
        province_id: req.session.province_id,
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
        region: req.session.region,
      });
    } else {
      res.status(400).json({ error: "Trạng thái đăng nhập không hợp lệ" });
    }
  } else {
    // Trả về thông tin người dùng ẩn danh nếu không đăng nhập
    res.json({
      name: "Người dùng ẩn danh",
      roleId: 0,
      isAdmin: false,
    });
  }
});

// Thiết lập Socket.io cho Chatbox
let users = [];

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  function updateUnreadCountForAllAdmins() {
    const unreadCount = users.filter((user) => user.unread).length;
    const admins = users.filter((user) => user.roleId === 3 && user.online);
    admins.forEach((admin) => {
      io.to(admin.socketId).emit("updateUnreadCount", unreadCount);
    });
  }

  function updateUserLastActiveTime(userName) {
    const userIndex = users.findIndex((user) => user.name === userName);
    if (userIndex !== -1) {
      users[userIndex].lastActiveTime = new Date().getTime();
    }
  }

  socket.on("requestUserList", () => {
    const clientUsers = users
      .filter((user) => user.messages && user.messages.length > 0)
      .map((user) => ({
        name: user.name,
        online: user.online,
        roleId: user.roleId,
        unread: user.unread,
      }));
    socket.emit("updateUserList", clientUsers);
  });

  socket.on("updateNewCount", (count) => {
    console.log("Received updateNewCount from client:", count);
    const admins = users.filter((x) => x.roleId === 3 && x.online);
    admins.forEach((admin) => {
      console.log(
        `Sending updateUnreadCount (${count}) to admin: ${admin.name}`
      );
      io.to(admin.socketId).emit("updateUnreadCount", count);
    });
  });

  socket.on("onLogin", (user) => {
    const existingUser = users.find((x) => x.name === user.name);
    if (existingUser) {
      existingUser.online = true;
      existingUser.socketId = socket.id; // Cập nhật socketId mới khi người dùng chuyển trang
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
      io.to(admin.socketId).emit(
        "updateUserList",
        users.filter((u) => u.roleId !== 3 && u.messages.length > 0)
      );
    });
  });

  socket.on("onMessage", (message) => {
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
            roleId: 0,
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
          io.to(admin.socketId).emit(
            "updateUserList",
            users.filter((u) => u.roleId !== 3 && u.messages.length > 0)
          );
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const userIndex = users.findIndex((x) => x.socketId === socket.id);
    if (userIndex !== -1) {
      users[userIndex].online = false;
      updateUnreadCountForAllAdmins();
      const admins = users.filter((x) => x.roleId === 3 && x.online);
      admins.forEach((admin) => {
        io.to(admin.socketId).emit(
          "updateUserList",
          users.filter((u) => u.roleId !== 3 && u.messages.length > 0)
        );
      });
    }
  });

  socket.on("updateLastActiveTime", (userName) => {
    updateUserLastActiveTime(userName);
  });
});

// Thêm error handler cho pool
db.on('error', function(err) {
  console.error('Database error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Đang thử kết nối lại...');
    handleReconnect();
  }
});

// Tách logic reconnect thành hàm riêng
function handleReconnect() {
  setTimeout(() => {
    db.getConnection()
      .then(connection => {
        console.log('Đã kết nối lại thành công');
        connection.release();
      })
      .catch(err => {
        console.error('Kết nối lại thất bại:', err);
        handleReconnect();
      });
  }, 2000);
}

// Kiểm tra kết nối ban đầu
db.getConnection()
  .then(connection => {
    console.log('Đã kết nối thành công đến MySQL');
    connection.release();
  })
  .catch(err => {
    console.error('Lỗi kết nối database:', err);
  });

// Thêm vào đầu file
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Đảm bảo app lắng nghe đúng port
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

