const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");
const express = require("express");
const app = express();
const { Web3 } = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const path = require('path');
// require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
// const dotenv = require("dotenv");
const mysql = require("mysql");
require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const QrCode = require("qrcode-reader");
const { Network, Alchemy } = require("alchemy-sdk");
const util = require('util'); // Thêm dòng này
const bodyParser = require('body-parser');
const fs = require('fs');

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

// Thêm middleware CORS vào đầu file sau phần import
const cors = require('cors');

app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { notifyNewBatch, notifyApproveBatch } = require('.//notification');

// Tạo thư mục uploads
const uploadDir = path.join(__dirname, 'public', 'uploads', 'batches');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Thay đổi cấu hình multer
const storage = multer.diskStorage({
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

// Cập nhật cấu hình upload
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024,
    files: 10 
  }
}).fields([
  { name: "productImages", maxCount: 10 },
  { name: "certificateImage", maxCount: 1 }
]);

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000
});

// Xử lý lỗi kết nối
db.on('error', (err) => {
  console.error('Lỗi kết nối database:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Kết nối database bị mất, đang thử kết nối lại...');
    handleReconnect();
  }
});

function handleReconnect() {
  db.connect((err) => {
    if (err) {
      console.error('Lỗi khi kết nối lại:', err);
      setTimeout(handleReconnect, 2000);
    } else {
      console.log('Đã kết nối lại thành công');
    }
  });
}

// Kết nối ban đầu
db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối cơ sở dữ liệu:", err.message);
    setTimeout(handleReconnect, 2000);
    return;
  }
  console.log("Đã kết nối cơ sở dữ liệu");
});

const query = util.promisify(db.query).bind(db);

const uploadQR = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA,
};

const alchemy = new Alchemy(settings);
// Thêm dòng này ở đầu file nếu chưa có
//const Web3 = require('web3');

// Sửa đổi cách đọc và xử lý private key
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey || privateKey.length !== 64) {
  console.error("Invalid private key in .env file");
  process.exit(1);
}

const formattedPrivateKey = privateKey.startsWith("0x")
  ? privateKey
  : `0x${privateKey}`;

// Khởi tạo Web3 và tài khoản
const web3 = new Web3(
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

web3.eth.net.isListening()
.then(() => console.log('Web3 is connected'))
.catch(e => console.log('Wow. Something went wrong: ' + e));

const adminAddress = account.address;

web3.eth.net
  .isListening()
  .then(() => console.log("Đã kết nối với ETH node"))
  .catch((e) => console.log("Lỗi rồi", e));

console.log("Admin address:", adminAddress);

const traceabilityContractABI =
  require("../build/contracts/TraceabilityContract.json").abi;
const traceabilityContractAddress = process.env.TRACEABILITY_CONTRACT_ADDRESS;
const traceabilityContract = new web3.eth.Contract(
  traceabilityContractABI,
  traceabilityContractAddress
);

// ABI và địa chỉ của contract ActivityLog
const activityLogABI = require("../build/contracts/ActivityLog.json").abi;
const activityLogAddress = process.env.ACTIVITY_LOG_CONTRACT_ADDRESS;
const activityLogContract = new web3.eth.Contract(
  activityLogABI,
  activityLogAddress
);

// Tạo thư mục uploads cho activities
const activityUploadDir = path.join(__dirname, 'public', 'uploads', 'activities');
if (!fs.existsSync(activityUploadDir)) {
  fs.mkdirSync(activityUploadDir, { recursive: true });
}

// Cấu hình storage cho activities
const activityStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const today = new Date();
    const uploadPath = path.join(
      activityUploadDir,
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

// Cập nhật cấu hình multer cho activities
const activityUpload = multer({
  storage: activityStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Tối đa 5 ảnh
  }
}).array("imageUrls", 5);

const { CID } = require("multiformats/cid");
const { sha256 } = require("multiformats/hashes/sha2");
const { base58btc } = require("multiformats/bases/base58");

const BUCKET_NAME = "nckh";

async function uploadFile(file) {
  try {
    // File đã được lưu bởi multer, chỉ cần trả về URL
    const relativePath = path.relative(path.join(__dirname, 'public'), file.path);
    const publicUrl = `/${relativePath}`;
    console.log(`File uploaded successfully: ${publicUrl}`);
    return {
      success: true,
      ipfsUrl: publicUrl // Giữ tên ipfsUrl để tương thích với code cũ
    };
  } catch (error) {
    console.error("Lỗi khi xử lý file:", error);
    throw error;
  }
}

function convertBigIntToString(item) {
  if (typeof item === "bigint") {
    return item.toString();
  }
  if (Array.isArray(item)) {
    return item.map(convertBigIntToString);
  }
  if (typeof item === "object" && item !== null) {
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        convertBigIntToString(value),
      ])
    );
  }
  return item;
}
function translateStatus(status) {
  const statusTranslations = {
    PendingApproval: "Chờ phê duyệt",
    Approved: "Đã phê duyệt",
    Rejected: "Đã từ chối",
  };
  return statusTranslations[status] || status;
}

async function checkFileStatusWithRetry(
  fileName,
  maxRetries = 5,
  retryDelay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
      };

      const command = new HeadObjectCommand(params);
      const result = await s3Client.send(command);
      console.log("Thông tin file:", result);
      console.log(`Trạng thái file: Tồn tại`);

      const cid = result.Metadata.cid;
      console.log(`CID từ Filebase: ${cid}`);

      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
      console.log(`IPFS URL: ${ipfsUrl}`);

      return { cid, ipfsUrl };
    } catch (error) {
      if (error.name !== "NotFound") {
        console.error("Lỗi khi kiểm tra trạng thái:", error);
        throw error;
      }
      if (i < maxRetries - 1) {
        console.log(`File chưa sẵn sàng, thử lại sau ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.log(`Trạng thái file: Không tồn tại sau ${maxRetries} lần thử`);
        throw new Error("File không tồn tại sau nhiều lần thử");
      }
    }
  }
}
async function processFiles(files) {
  const processedFiles = {};

  if (
    !files.productImages ||
    !Array.isArray(files.productImages) ||
    files.productImages.length === 0
  ) {
    throw new Error("Thiếu ảnh lô hàng");
  }

  processedFiles.productImages = [];
  for (const file of files.productImages) {
    const result = await uploadFile(file.buffer, file.originalname);
    processedFiles.productImages.push(result.ipfsUrl);
    console.log(`Đã xử lý ảnh sản phẩm: ${result.ipfsUrl}`);
  }

  if (files.certificateImage && files.certificateImage[0]) {
    const certificateFile = files.certificateImage[0];
    const result = await uploadFile(
      certificateFile.buffer,
      certificateFile.originalname
    );
    processedFiles.certificateImage = result.ipfsUrl;
    console.log(`Đã xử lý ảnh chứng nhận: ${result.ipfsUrl}`);
  } else {
    processedFiles.certificateImage = "default_certificate_image_url";
  }

  return processedFiles;
}

function replacer(key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function cleanKeys(obj) {
  const cleanedObj = {};
  for (const key in obj) {
    const cleanKey = key.trim();
    cleanedObj[cleanKey] = obj[key];
  }
  return cleanedObj;
}
function convertBigIntToString(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

app.use(express.urlencoded({ extended: true }));

async function checkUserExists(userId) {
  try {
    const rows = await query("SELECT * FROM users WHERE uid = ?", [userId]);
    return rows.length > 0;
  } catch (error) {
    console.error("Lỗi khi kiểm tra người dùng:", error);
    throw new Error("Không thể kiểm tra thông tin người dùng: " + error.message);
  }
}
async function testDatabaseConnection() {
  try {
    await query('SELECT 1');
    console.log('Kết nối database thành công');
  } catch (error) {
    console.error('Lỗi kết nối database:', error);
    throw error;
  }
}

testDatabaseConnection();

async function checkProductExists(productId) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [productId],
      (error, results) => {
        if (error) return reject(error);
        resolve(results.length > 0);
      }
    );
  });
}

async function getProducerById(producerId) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT name, address, phone FROM users WHERE uid = ?",
      [producerId],
      (err, results) => {
        if (err) {
          console.error("Lỗi truy vấn cơ sở dữ liệu:", err);
          return reject(err);
        }
        if (results.length === 0) {
          return resolve({
            name: "Không xác định",
            address: "Không xác định",
            phone: "Không xác định",
          });
        }
        resolve(results[0]);
      }
    );
  });
}

// Thêm hàm cleanupUploadedFiles
function cleanupUploadedFiles(files) {
  if (!files) return;
  
  // Nếu files là một mảng
  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } 
  // Nếu files là một object chứa các file
  else if (typeof files === 'object') {
    Object.values(files).forEach(fileArray => {
      if (Array.isArray(fileArray)) {
        fileArray.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    });
  }
}

function setupRoutes(app, db) {
  // Thêm middleware kiểm tra kết nối database
  app.use(async (req, res, next) => {
    try {
      // Kiểm tra kết nối trước mỗi request
      const connection = await db.getConnection();
      connection.release();
      next();
    } catch (err) {
      console.error('Database connection error:', err);
      res.status(500).json({ error: 'Lỗi kết nối database' });
    }
  });

  app.get("/batches/:producerId", async (req, res) => {
    try {
      const producerId = parseInt(req.params.producerId, 10);

      if (isNaN(producerId) || producerId <= 0) {
        return res.status(400).send("Producer ID không hợp lệ");
      }

      const batches = await traceabilityContract.methods
        .getBatchesByProducer(producerId)
        .call();
      const serializedBatches = convertBigIntToString(batches);
      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error("Error fetching batches:", err);
      res.status(500).send("Lỗi khi lấy danh sách lô hàng: " + err.message);
    }
  });

  app.get("/create-batch", (req, res) => {
    res.sendFile(
      path.join(__dirname, "public", "san-xuat", "them-lo-hang.html")
    );
  });

  app.post(
    "/createbatch",
    (req, res, next) => {
      upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ error: "Lỗi upload file: " + err.message });
        } else if (err) {
          return res.status(500).json({ error: "Lỗi server: " + err.message });
        }
        next();
      });
    },
    async (req, res) => {
      console.log("Received body:", req.body);
      console.log("Received files:", req.files);
      let connection;

      try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const {
          name,
          quantity,
          farmPlotNumber,
          productId,
          producerId,
          region_id,
          startDate,
          endDate,
        } = req.body;
      

        if (
          !name ||
          !quantity ||
          !farmPlotNumber ||
          !productId ||
          !producerId ||
          !startDate ||
          !endDate
        ) {
          return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        const cleanProductId = parseInt(productId, 10);
        const cleanProducerId = parseInt(producerId, 10);
        const cleanStartDate = Math.floor(new Date(startDate).getTime() / 1000);
        const cleanEndDate = Math.floor(new Date(endDate).getTime() / 1000);

        if (isNaN(cleanProductId) || cleanProductId <= 0) {
          return res.status(400).json({ error: "Product ID không hợp lệ" });
        }
        if (isNaN(cleanProducerId) || cleanProducerId <= 0) {
          return res.status(400).json({ error: "Producer ID không hợp lệ" });
        }
        if (isNaN(cleanStartDate) || cleanStartDate <= 0) {
          return res.status(400).json({ error: "Ngày bắt đầu không hợp lệ" });
        }
        if (isNaN(cleanEndDate) || cleanEndDate <= 0) {
          return res.status(400).json({ error: "Ngày kết thúc không hợp lệ" });
        }
        if (cleanStartDate >= cleanEndDate) {
          return res
            .status(400)
            .json({ error: "Ngày kết thúc phải sau ngày bắt đầu" });
        }

        console.log("cleanProducerId:", cleanProducerId);
        const userExists = await checkUserExists(cleanProducerId);
        const productExists = await checkProductExists(cleanProductId);

        if (!userExists) {
          return res.status(400).json({ error: "Producer ID không tồn tại" });
        }
        if (!productExists) {
          return res.status(400).json({ error: "Product ID không tồn tại" });
        }

        let productImageUrls = [];

        if (
          req.files &&
          req.files["productImages"] &&
          req.files["productImages"].length > 0
        ) {
          console.log(
            `Số lượng ảnh sản phẩm nhận được: ${req.files["productImages"].length}`
          );

          for (const file of req.files["productImages"]) {
            try {
              const result = await uploadFile(file);
              productImageUrls.push(result.ipfsUrl);
              console.log(`Đã thêm URL ảnh sản phẩm: ${result.ipfsUrl}`);
            } catch (uploadError) {
              cleanupUploadedFiles(req.files);
              throw uploadError;
            }
          }

          console.log(
            `Tổng số URL ảnh sản phẩm sau khi xử lý: ${productImageUrls.length}`
          );
        } else {
          console.log("Không có ảnh sản phẩm được gửi lên");
          return res.status(400).json({ error: "Thiếu ảnh sản phẩm" });
        }

        let certificateImageUrl = "";

        if (req.files["certificateImage"] && req.files["certificateImage"][0]) {
          const result = await uploadFile(req.files["certificateImage"][0]);
          certificateImageUrl = result.ipfsUrl;
          console.log("Certificate image uploaded:", certificateImageUrl);
        } else {
          certificateImageUrl = "/uploads/default/certificate.jpg";
        }

        console.log("Calling createBatch with params:", {
          name,
          cleanProducerId,
          quantity,
          productImageUrls,
          certificateImageUrl,
          farmPlotNumber,
          cleanProductId,
          cleanStartDate,
          cleanEndDate,
        });

        const result = await traceabilityContract.methods
          .createBatch(
            name,
            cleanProducerId,
            quantity,
            productImageUrls,
            certificateImageUrl,
            farmPlotNumber,
            cleanProductId,
            cleanStartDate,
            cleanEndDate
          )
          .send({ from: account.address, gas: 5000000 });

        console.log(
          "Transaction result:",
          JSON.stringify(convertBigIntToString(result), null, 2)
        );

        let batchId;
        if (result.events && result.events.BatchCreated) {
          batchId = result.events.BatchCreated.returnValues.batchId;
        } else {
          const log = result.logs.find((log) => log.event === "BatchCreated");
          batchId = log ? log.returnValues.batchId : "Unknown";
        }

         // Gọi hàm thông báo với connection từ transaction
        await notifyNewBatch(connection, name, cleanProducerId, region_id);
        // Commit transaction
        await connection.commit();

        res.status(200).json({
          message: "Lô hàng đã được tạo thành công và đang chờ phê duyệt",
          batchId: batchId.toString(), // Chuyển đổi batchId thành chuỗi
          status: "PendingApproval",
        });
      } catch (err) {
        if (req.files) {
          cleanupUploadedFiles(req.files);
        }
        if (connection) {
          await connection.rollback();
        }
        console.error("Error creating batch:", err);
        res.status(500).json({ error: "Lỗi khi tạo lô hàng: " + err.message });
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  );

  // API lấy thông báo cho nhà kiểm duyệt
  app.get("/api/inspector-notifications", async (req, res) => {
    try {
      const userId = req.session.userId;
      const [notifications] = await db.query(
        `SELECT 
          n.id AS notification_id,
          b.batch_name,
          b.created_on,
          u.name AS producer_name,
          'batch_upload' AS notification_type
        FROM notification n
        JOIN notification_object no ON n.notification_object_id = no.id 
        JOIN batch b ON no.entity_id = b.id
        JOIN users u ON b.actor_id = u.uid
        WHERE n.user_id = ? AND n.recipient_type = 'user'
        ORDER BY b.created_on DESC`,
        [userId]
      );

      res.json(notifications);
    } catch (error) {
      console.error("Lỗi khi lấy thông báo:", error);
      res.status(500).json({ error: "Lỗi server khi lấy thông báo" });
    }
  });

  // API để lấy thông báo cho nhà sản xuất
  app.get("/api/producer-notifications", async (req, res) => {
    try {
      const userId = req.session.userId;
      const [notifications] = await db.query(
        `SELECT 
          n.id AS notification_id,
          n.status as status,
          b.batch_name,
          b.approved_on,
          u.name AS inspector_name,
          'batch_approval' AS notification_type
        FROM notification n
        JOIN notification_object no ON n.notification_object_id = no.id 
        JOIN batch b ON no.entity_id = b.id
        JOIN users u ON b.approved_by = u.uid
        WHERE n.user_id = ? AND n.recipient_type = 'user'
        ORDER BY b.approved_on DESC`,
        [userId]
      );

      res.json(notifications);
    } catch (error) {
      console.error("Lỗi khi lấy thông báo:", error);
      res.status(500).json({ error: "Lỗi server khi lấy thông báo" });
    }
  }); 

  app.get("/create-activity", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "san-xuat", "them-nkhd.html"));
  });
  
  app.post(
    "/createactivity",
    (req, res, next) => {
      activityUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ error: "Lỗi upload file: " + err.message });
        } else if (err) {
          return res.status(500).json({ error: "Lỗi server: " + err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        console.log("Received body:", req.body);
        console.log("Received files:", req.files);

        const {
          activityName,
          description,
          relatedProductIds,
          isSystemGenerated,
        } = req.body;
        const uid = req.session.userId; // Lấy uid từ session

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            try {
              const result = await uploadFile(file);
              imageUrls.push(result.ipfsUrl);
              console.log(`Đã thêm URL ảnh hoạt động: ${result.ipfsUrl}`);
            } catch (uploadError) {
              cleanupUploadedFiles(req.files);
              throw uploadError;
            }
          }
        }

        console.log("imageUrls sau khi xử lý:", imageUrls);

        // Chuyển đổi relatedProductIds thành mảng số nguyên
        const productIds = Array.isArray(relatedProductIds)
          ? relatedProductIds.map((id) => parseInt(id, 10))
          : relatedProductIds
          ? [parseInt(relatedProductIds, 10)]
          : [];

        console.log("Bắt đầu gọi hàm addActivityLog");
        console.log("uid:", uid);
        console.log("activityName:", activityName);
        console.log("description:", description);
        console.log("isSystemGenerated:", isSystemGenerated === "true");
        console.log("imageUrls:", imageUrls);
        console.log("productIds:", productIds);

        const gasEstimate = await activityLogContract.methods
          .addActivityLog(
            BigInt(uid),
            BigInt(uid),
            activityName,
            description,
            isSystemGenerated === "true",
            imageUrls,
            productIds.map((id) => BigInt(id))
          )
          .estimateGas({ from: account.address });

        console.log("Ước tính gas:", gasEstimate);

        const result = await activityLogContract.methods
          .addActivityLog(
            BigInt(uid),
            BigInt(uid),
            activityName,
            description,
            isSystemGenerated === "true",
            imageUrls,
            productIds.map((id) => BigInt(id))
          )
          .send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate) * 1.5).toString(),
          });

        console.log("Kết quả giao dịch:", result);
        if (result.events && result.events.ActivityLogAdded) {
          console.log(
            "Event ActivityLogAdded:",
            result.events.ActivityLogAdded.returnValues
          );
        } else {
          console.log("Không tìm thấy event ActivityLogAdded");
        }

        // Thêm thông tin thành công vào response
        res.status(200).json({
          success: true,
          message: "Nhật ký hoạt động đã được thêm thành công",
          transactionHash: result.transactionHash,
          imageUrls: imageUrls,
        });

      } catch (error) {
        if (req.files) {
          cleanupUploadedFiles(req.files);
        }
        console.error("Lỗi thêm nhật ký hoạt động:", error);
        res.status(500).json({ 
          success: false,
          error: "Lỗi thêm nhật ký hoạt động: " + error.message 
        });
      }
    }
  );

  app.get("/api/pending-batches", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đng nhập" });
      }

      const producerId = req.session.userId;
      const pendingBatches = await traceabilityContract.methods
        .getPendingBatchesByProducer(producerId)
        .call();

      // Chuyển đổi trạng thái từ số sang chuỗi và dịch sang tiếng Việt
      const statusMap = ["PendingApproval", "Approved", "Rejected"];

      const serializedBatches = pendingBatches.map((batch) => ({
        ...convertBigIntToString(batch),
        status: translateStatus(statusMap[batch.status] || "Unknown"),
        productImageUrls: batch.productImageUrls,
        certificateImageUrl: batch.certificateImageUrl,
      }));

      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error("Error fetching pending batches for producer:", err);
      res
        .status(500)
        .json({
          error:
            "Lỗi khi lấy danh sách lô hàng đang chờ kiểm duyệt: " + err.message,
        });
    }
  });

  app.get("/api/pending-batches", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const producerId = req.session.userId;
      const pendingBatches = await traceabilityContract.methods
        .getPendingBatchesByProducer(producerId)
        .call();

      // Chuyển đổi trạng thái từ số sang chuỗi và dịch sang tiếng Việt
      const statusMap = ["PendingApproval", "Approved", "Rejected"];

      const serializedBatches = pendingBatches.map((batch) => ({
        ...convertBigIntToString(batch),
        status: translateStatus(statusMap[batch.status] || "Unknown"),
        productImageUrls: batch.productImageUrls,
        certificateImageUrl: batch.certificateImageUrl,
      }));

      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error("Error fetching pending batches for producer:", err);
      res
        .status(500)
        .json({
          error:
            "Lỗi khi lấy danh sách lô hàng đang chờ kiểm duyệt: " + err.message,
        });
    }
  });

  app.get("/api/pending-batches-by-region", async (req, res) => {
    try {
      console.log("Bắt đầu xử lý yêu cầu lấy lô hàng chưa duyệt theo vùng");
      if (!req.session.userId) {
        console.log("Người dùng chưa đăng nhập");
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const userId = req.session.userId;
      console.log("Người dùng đã đăng nhập với ID:", userId);

      // 1. Lấy thông tin người kiểm định
      const [approvers] = await db.query(
        "SELECT * FROM users WHERE uid = ? AND role_id = 2",
        [userId]
      );
      if (approvers.length === 0) {
        return res
          .status(404)
          .json({
            error:
              "Không tìm thấy thông tin người kiểm định hoặc người dùng không có quyền kiểm định",
          });
      }
      const approver = approvers[0];
      const approverRegionId = approver.region_id;

      console.log("Vùng của người kiểm định:", approverRegionId);

      // 2. Tìm tất cả người sản xuất cùng vùng
      const [producers] = await db.query(
        "SELECT uid FROM users WHERE region_id = ? AND role_id = 1",
        [approverRegionId]
      );

      console.log("Số lượng người sản xuất cùng vùng:", producers.length);

      // 3. Lấy danh sách lô hàng chưa duyệt từ blockchain
      const allPendingBatches = await traceabilityContract.methods
        .getAllPendingBatches()
        .call();
      console.log("Tổng số lô hàng chưa duyệt:", allPendingBatches.length);

      // 4. Lọc lô hàng của người sản xuất cùng vùng
      const filteredBatches = allPendingBatches.filter((batch) =>
        producers.some(
          (producer) => producer.uid === parseInt(batch.producerId)
        )
      );

      console.log("Số lô hàng chưa duyệt theo vùng:", filteredBatches.length);

      // Chuyển đổi trạng thái từ số sang chuỗi và dịch sang tiếng Việt
      const statusMap = ["PendingApproval", "Approved", "Rejected"];

      const serializedBatches = await Promise.all(
        filteredBatches.map(async (batch) => {
          const [producers] = await db.query(
            "SELECT name FROM users WHERE uid = ?",
            [batch.producerId]
          );
          const producerName =
            producers.length > 0 ? producers[0].name : "Unknown";

          return {
            batchId: batch.batchId.toString(),
            name: batch.name,
            // sscc: batch.sscc,
            producerName: producerName,
            quantity: batch.quantity.toString(),
            productionDate: batch.productionDate.toString(),
            status: translateStatus(statusMap[batch.status] || "Unknown"),
            productImageUrls: batch.productImageUrls,
            certificateImageUrl: batch.certificateImageUrl,
          };
        })
      );

      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error("Error fetching pending batches by region:", err);
      res
        .status(500)
        .json({
          error:
            "Lỗi khi lấy danh sách lô hàng đang chờ kiểm duyệt: " + err.message,
        });
    }
  });

  // Lấy SSCC của lô hàng đã được phê duyệt
  app.get("/api/approved-batch-sscc/:batchId", async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const batchDetails = await traceabilityContract.methods
        .getBatchDetails(batchId)
        .call();

      if (batchDetails.status.toString() !== "1") {
        // 1 tương ứng với BatchStatus.Approved
        return res.status(400).json({ error: "Lô hàng chưa được phê duyệt" });
      }

      res.json({ sscc: batchDetails.sscc });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Không thể lấy SSCC của l�� hàng: " + error.message });
    }
  });

  // Lấy thông tin lô hàng từ SSCC
  app.get("/api/batch/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;
      const batchDetails = await traceabilityContract.methods
        .getBatchBySSCC(sscc)
        .call();
      const serializedBatch = {
        batchId: batchDetails.batchId.toString(),
        name: batchDetails.name,
        sscc: batchDetails.sscc,
        producerId: batchDetails.producerId.toString(),
        quantity: batchDetails.quantity,
        productionDate: new Date(
          batchDetails.productionDate * 1000
        ).toISOString(),
        status: translateStatus(batchDetails.status),
        productImageUrls: batchDetails.productImageUrls,
        certificateImageUrl: batchDetails.certificateImageUrl,
        farmPlotNumber: batchDetails.farmPlotNumber,
        productId: batchDetails.productId.toString(),
      };
      res.json(serializedBatch);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Không thể lấy thông tin lô hàng: " + error.message });
    }
  });
  // Cập nhật trạng thái lô hàng khi được phê duyệt hoặc từ chối
  app.post("/api/update-batch-status", async (req, res) => {
    try {
      const { batchId, newStatus } = req.body;
      await traceabilityContract.methods
        .updateBatchStatus(batchId, newStatus)
        .send({ from: account.address });
      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Không thể cập nhật trạng thái: " + error.message });
    }
  });

  // Hàm để lấy vùng sản xuất của người sản xuất từ SQL
  async function getProducerRegion(producerId) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT region_id FROM users WHERE uid = ?",
        [producerId],
        (err, results) => {
          if (err) {
            console.error("Lỗi truy vấn cơ sở dữ liệu:", err);
            return reject(err);
          }

          if (results.length === 0) {
            return reject(new Error("Không tìm thấy người sản xuất"));
          }

          resolve(results[0].region_id);
        }
      );
    });
  }

  app.get("/api/local-batch-id/:blockchainBatchId", async (req, res) => {
    let connection;
    try {
      const blockchainBatchId = req.params.blockchainBatchId;
      
      // Lấy thông tin batch từ blockchain
      const batchDetails = await traceabilityContract.methods
        .getBatchDetails(blockchainBatchId)
        .call();
  
      connection = await db.getConnection();
      
      // Chuyển đổi timestamp blockchain sang UTC
      const productionDateUTC = new Date(Number(batchDetails.productionDate) * 1000);
      
      // Truy vấn sử dụng UTC_TIMESTAMP() và CONVERT_TZ để chuẩn hóa múi giờ
      const [batchResult] = await connection.query(
        `SELECT id FROM batch 
         WHERE batch_name = ? 
         AND actor_id = ? 
         AND ABS(
           TIMESTAMPDIFF(
             SECOND, 
             CONVERT_TZ(created_on, @@session.time_zone, '+00:00'),
             ?
           )
         ) < 60
         LIMIT 1`,
        [
          batchDetails.name, 
          batchDetails.producerId, 
          productionDateUTC.toISOString().slice(0, 19).replace('T', ' ')
        ]
      );
  
      if (batchResult.length === 0) {
        return res.status(404).json({ 
          error: "Không tìm thấy batch ID trong hệ thống" 
        });
      }
  
      res.json({
        localBatchId: batchResult[0].id
      });
  
    } catch (error) {
      console.error("Lỗi khi lấy local batch ID:", error);
      res.status(500).json({ 
        error: "Lỗi khi lấy local batch ID: " + error.message 
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  app.post("/approve-batch/:batchId", async (req, res) => {
    let connection;
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const blockchainBatchId = req.params.batchId;
      const localBatchId = req.body.localBatchId;
      const userId = req.session.userId;

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Kiểm tra quyền kiểm duyệt
      const [approvers] = await connection.query(
        "SELECT * FROM users WHERE uid = ? AND role_id = 2",
        [userId]
      );
      if (approvers.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: "Người dùng không có quyền kiểm duyệt" });
      }

      // Kiểm tra trạng thái hiện tại của lô hàng
      const batchDetails = await traceabilityContract.methods
        .getBatchDetails(blockchainBatchId)
        .call();
      if (batchDetails.status != 0) {
        await connection.rollback();
        return res.status(400).json({
          error: "Lô hàng này đã được xử lý bởi người kiểm duyệt khác",
        });
      }

      // Gọi hàm approveBatch từ smart contract
      const result = await traceabilityContract.methods
        .approveBatch(blockchainBatchId, userId)
        .send({ from: account.address, gas: 3000000 });

      // Gọi hàm thông báo với local batch ID
      await notifyApproveBatch(connection, localBatchId, userId, 1);

      await connection.commit();
      res.status(200).json({
        message: "Lô hàng đã được phê duyệt thành công",
        transactionHash: result.transactionHash,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Lỗi khi phê duyệt lô hàng:", error);
      res.status(500).json({ error: "Không thể phê duyệt lô hàng: " + error.message });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  app.post("/reject-batch/:batchId", async (req, res) => {
    let connection;
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const blockchainBatchId = req.params.batchId;
      const localBatchId = req.body.localBatchId;
      const userId = req.session.userId;

      // Kiểm tra xem người dùng có phải là nhà kiểm định không
      const [approvers] = await connection.query(
        "SELECT * FROM users WHERE uid = ? AND role_id = 2",
        [userId]
      );
      if (approvers.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: "Người dùng không có quyền kiểm định" });
      }

      // Kiểm tra trạng thái hiện tại của lô hàng
      const batchDetails = await traceabilityContract.methods
        .getBatchDetails(blockchainBatchId)
        .call();
      if (batchDetails.status != 0) {
        await connection.rollback();
        return res.status(400).json({
          error: "Lô hàng này đã được xử lý bởi người kiểm duyệt khác",
        });
      }

      // Gọi hàm rejectBatch từ smart contract
      const result = await traceabilityContract.methods
        .rejectBatch(blockchainBatchId, userId)
        .send({ from: account.address, gas: 3000000 });

        console.log("Thông tin lô hàng từ chối: ", localBatchId, userId);

      // Gọi hàm notifyApproveBatch để lưu thông báo từ chối
      await notifyApproveBatch(connection, localBatchId, userId, 2);
      
      // Commit transaction nếu mọi thứ thành công
      await connection.commit();

      res.status(200).json({
        message: "Lô hàng đã bị từ chối thành công",
        transactionHash: result.transactionHash,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Lỗi khi từ chối lô hàng:", error);
      res.status(500).json({ error: "Không thể từ chối lô hàng: " + error.message });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  app.get("/batch-details/:batchId", async (req, res) => {
    try {
      const batchId = req.params.batchId;
      console.log("Đang lấy chi tiết cho lô hàng:", batchId);

      // Gọi hàm getBatchDetails từ smart contract
      const batchDetails = await traceabilityContract.methods
        .getBatchDetails(batchId)
        .call();
      console.log("Chi tiết lô hàng từ blockchain:", batchDetails);

      // Xử lý và định dạng dữ liệu
      const formattedBatchDetails = {
        batchId: batchDetails.batchId,
        name: batchDetails.name,
        producerName: await getProducerNameById(batchDetails.producerId),
        quantity: batchDetails.quantity,
        productionDate: batchDetails.productionDate,
        startDate: batchDetails.startDate,
        endDate: batchDetails.endDate,
        status: translateStatus(batchDetails.status),
        farmPlotNumber: batchDetails.farmPlotNumber,
        productImageUrls: batchDetails.productImageUrls,
        certificateImageUrl: batchDetails.certificateImageUrl,
      };

      res.json(formattedBatchDetails);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết lô hàng:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy chi tiết lô hàng: " + error.message });
    }
  });

  async function getProducerNameById(producerId) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT name FROM users WHERE uid = ?",
        [producerId],
        (err, results) => {
          if (err) {
            console.error("Lỗi truy vấn cơ sở dữ liệu:", err);
            return reject(err);
          }
          if (results.length === 0) {
            return resolve("Không xác định");
          }
          resolve(results[0].name);
        }
      );
    });
  }
  app.get("/api/batches", async (req, res) => {
    try {
      console.log("Bắt đầu xử lý yêu cầu lấy danh sách lô hàng");
      if (!req.session.userId) {
        console.log("Người dùng chưa đăng nhập");
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const userId = req.session.userId;
      console.log("Người dùng đã đăng nhập với ID:", userId);

      const status = req.query.status; // Lấy trạng thái từ query parameter
      console.log("Trạng thái lọc:", status);

      // Lấy tất cả lô hàng của người sản xuất
      const allBatches = await traceabilityContract.methods
        .getBatchesByProducer(userId)
        .call();
      console.log("Tổng số lô hàng:", allBatches.length);

      // Lọc lô hàng theo trạng thái nếu có
      let filteredBatches = allBatches;
      if (status) {
        const statusMap = {
          "Chờ phê duyệt": "0",
          "Đã phê duyệt": "1",
          "Đã từ chối": "2",
        };
        filteredBatches = allBatches.filter((batch) => {
          const translatedStatus = translateStatus(batch.status.toString());
          console.log(`Comparing: ${translatedStatus} with ${status}`);
          return translatedStatus === status;
        });
      }
      console.log("Số lô hàng sau khi lọc:", filteredBatches.length);

      const serializedBatches = await Promise.all(
        filteredBatches.map(async (batch) => {
          const [producers] = await db.query(
            "SELECT name FROM users WHERE uid = ?",
            [batch.producerId]
          );
          const producerName =
            producers.length > 0 ? producers[0].name : "Unknown";

          console.log("Raw batch status:", batch.status);
          const translatedStatus = translateStatus(batch.status.toString());
          console.log("Translated status:", translatedStatus);

          return {
            batchId: batch.batchId.toString(),
            name: batch.name,
            producerName: producerName,
            quantity: batch.quantity.toString(),
            productionDate: batch.productionDate.toString(),
            status: translatedStatus,
            productImageUrls: batch.productImageUrls,
            certificateImageUrl: batch.certificateImageUrl,
          };
        })
      );

      console.log(
        "Serialized batches:",
        JSON.stringify(serializedBatches, null, 2)
      );

      res.status(200).json(serializedBatches);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lô hàng:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy danh sách lô hàng: " + error.message });
    }
  });
  app.get("/api/approved-batches", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const userId = req.session.userId;
      console.log("Gọi hàm getApprovedBatchesByProducer với userId:", userId);

      const approvedBatches = await traceabilityContract.methods
        .getApprovedBatchesByProducer(userId)
        .call({ from: account.address });
      console.log("Số lượng lô hàng đã duyệt:", approvedBatches.length);

      const serializedBatches = approvedBatches.map((batch) => {
        const serializedBatch = {
          batchId: batch.batchId.toString(),
          name: batch.name,
          sscc: batch.sscc || "",
          quantity: batch.quantity.toString(),
          productionDate: batch.productionDate.toString(),
          status: translateStatus(batch.status),
          productImageUrls: batch.productImageUrls,
          certificateImageUrl: batch.certificateImageUrl,
        };
        console.log(
          "Serialized batch:",
          JSON.stringify(serializedBatch, null, 2)
        );
        return serializedBatch;
      });

      res.status(200).json(serializedBatches);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lô hàng đã duyệt:", error);
      res
        .status(500)
        .json({
          error: "Không thể lấy danh sách lô hàng đã duyệt: " + error.message,
        });
    }
  });

  app.get("/api/rejected-batches", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const userId = req.session.userId;
      console.log("Gọi hàm getRejectedBatchesByProducer với userId:", userId);

      const rejectedBatches = await traceabilityContract.methods
        .getRejectedBatchesByProducer(userId)
        .call({ from: account.address });
      console.log("Số lượng lô hàng bị từ chối:", rejectedBatches.length);

      const serializedBatches = rejectedBatches.map((batch) => ({
        batchId: batch.batchId.toString(),
        name: batch.name,
        quantity: batch.quantity.toString(),
        productionDate: batch.productionDate.toString(),
        status: translateStatus(batch.status),
        productImageUrls: batch.productImageUrls,
        certificateImageUrl: batch.certificateImageUrl,
      }));

      res.status(200).json(serializedBatches);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lô hàng bị từ chối:", error);
      res
        .status(500)
        .json({
          error: "Không thể lấy danh sách lô hàng bị từ chối: " + error.message,
        });
    }
  });

  // Thêm route để cập nhật trạng thái vận chuyển
  // ... (các import và cấu hình khác)
  app.post("/api/accept-transport", async (req, res) => {
    try {
      const { sscc, action } = req.body;
      const userId = req.session.userId;
      const roleId = req.session.roleId;

      console.log("Received request:", { sscc, action, userId, roleId });

      if (!userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      // Kiểm tra action hợp lệ
      const validActions = [
        "Bat dau van chuyen",
        "Tam dung van chuyen",
        "Tiep tuc van chuyen",
        "Hoan thanh van chuyen",
      ];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Hành động không hợp lệ" });
      }

      // Thực hiện các truy vấn đồng thời
      const [participantResult, batchId] = await Promise.all([
        db.query("SELECT * FROM users WHERE uid = ? AND role_id IN (6, 8)", [
          userId,
        ]),
        traceabilityContract.methods.getBatchIdBySSCC(sscc).call(),
      ]);

      const [participant] = participantResult;
      if (!participant) {
        return res
          .status(403)
          .json({
            error: "Người dùng không có quyền vận chuyển hoặc nhận hàng",
          });
      }

      if (!batchId) {
        return res
          .status(404)
          .json({ error: "Không tìm thấy lô hàng với SSCC này" });
      }

      const participantType = roleId === 8 ? "Warehouse" : "Transporter";
      console.log("Participant type:", participantType);

      console.log("Updating transport status:", {
        batchId,
        userId,
        action,
        participantType,
      });
      await traceabilityContract.methods
        .updateTransportStatus(batchId, userId, action, participantType)
        .send({ from: account.address, gas: 500000 });

      res.json({
        success: true,
        message: "Đã cập nhật trạng thái vận chuyển thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái vận chuyển:", error);
      res
        .status(500)
        .json({
          error: "Không thể cập nhật trạng thái vận chuyển: " + error.message,
        });
    }
  });
  // Cập nhật route để lấy thông tin lô hàng
  app.get("/api/batch-info-by-sscc/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;
      const userId = req.session.userId;

      const batchInfo = await traceabilityContract.methods
        .getBatchBySSCC(sscc)
        .call();
      const transportStatus = await traceabilityContract.methods
        .getBatchTransportStatus(batchInfo.batchId)
        .call();
      const detailedTransportStatus = await traceabilityContract.methods
        .getDetailedTransportStatus(batchInfo.batchId)
        .call();

      const producerInfo = await getProducerById(batchInfo.producerId);

      console.log(
        "Calling isWarehouseConfirmed with:",
        batchInfo.batchId,
        userId
      );
      const warehouseConfirmed = await traceabilityContract.methods
        .isWarehouseConfirmed(batchInfo.batchId, userId)
        .call();

      const confirmedWarehouseIds = await traceabilityContract.methods
        .getConfirmedWarehouses(batchInfo.batchId)
        .call();

      // Lấy thông tin chi tiết của các nhà kho đã xác nhận
      const confirmedWarehouses = await Promise.all(
        confirmedWarehouseIds.map(async (warehouseId) => {
          const warehouseInfo = await getWarehouseInfo(warehouseId);
          return {
            id: warehouseId.toString(),
            name: warehouseInfo.name,
          };
        })
      );

      const safeConvert = (value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        if (Array.isArray(value)) {
          return value.map(safeConvert);
        }
        if (typeof value === "object" && value !== null) {
          return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, safeConvert(v)])
          );
        }
        return value;
      };

      const serializedBatchInfo = safeConvert({
        batchId: batchInfo.batchId,
        name: batchInfo.name,
        sscc: batchInfo.sscc,
        producerId: batchInfo.producerId,
        quantity: batchInfo.quantity,
        productionDate: new Date(
          Number(batchInfo.productionDate) * 1000
        ).toISOString(),
        status: translateStatus(batchInfo.status),
        productImageUrls: batchInfo.productImageUrls,
        certificateImageUrl: batchInfo.certificateImageUrl,
        farmPlotNumber: batchInfo.farmPlotNumber,
        productId: batchInfo.productId,
        transportStatus: translateTransportStatus(transportStatus),
        detailedTransportStatus: translateDetailedTransportStatus(
          detailedTransportStatus
        ),
        producer: {
          name: producerInfo.name,
          address: producerInfo.address,
          phone: producerInfo.phone,
        },
        warehouseConfirmed: warehouseConfirmed,
        confirmedWarehouses: confirmedWarehouses,
      });

      console.log(
        "Serialized Batch Info:",
        JSON.stringify(serializedBatchInfo, null, 2)
      );

      res.json(serializedBatchInfo);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin lô hàng từ SSCC:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy thông tin lô hàng: " + error.message });
    }
  });

  app.get("/api/batch-info-by-sscc-for-consumer/:sscc", async (req, res) => {
    let connection;
    try {
      const sscc = req.params.sscc;
      const userId = req.session.userId;

      // Lấy thông tin từ blockchain trước
      const batchInfo = await traceabilityContract.methods
        .getBatchBySSCC(sscc)
        .call();
      const transportStatus = await traceabilityContract.methods
        .getBatchTransportStatus(batchInfo.batchId)
        .call();
      const detailedTransportStatus = await traceabilityContract.methods
        .getDetailedTransportStatus(batchInfo.batchId)
        .call();

      const producerInfo = await getProducerById(batchInfo.producerId);

      // Lấy kết nối từ pool
      connection = await db.getConnection();
      
      // Thực hiện truy vấn với kết nối đã lấy
      const [userResults] = await connection.query(
        "SELECT * FROM users WHERE uid = ?", 
        [userId]
      );
      const userInfo = userResults[0];

      // Xử lý logic với warehouseConfirmed
      let warehouseConfirmed = false;
      if (userInfo && userInfo.role_id === 8) {
        const warehouseId = userInfo.warehouse_id;
        warehouseConfirmed = await traceabilityContract.methods
          .isWarehouseConfirmed(batchInfo.batchId, warehouseId)
          .call();
      }

      const confirmedWarehouseIds = await traceabilityContract.methods
        .getConfirmedWarehouses(batchInfo.batchId)
        .call();

      // Lấy thông tin chi tiết của các nhà kho đã xác nhận
      const confirmedWarehouses = await Promise.all(
        confirmedWarehouseIds.map(async (warehouseId) => {
          const warehouseInfo = await getWarehouseInfo(warehouseId);
          return {
            id: warehouseId.toString(),
            name: warehouseInfo.name,
          };
        })
      );

      const safeConvert = (value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        if (Array.isArray(value)) {
          return value.map(safeConvert);
        }
        if (typeof value === "object" && value !== null) {
          return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, safeConvert(v)])
          );
        }
        return value;
      };

      const serializedBatchInfo = safeConvert({
        batchId: batchInfo.batchId,
        name: batchInfo.name,
        sscc: batchInfo.sscc,
        producerId: batchInfo.producerId,
        quantity: batchInfo.quantity,
        productionDate: new Date(
          Number(batchInfo.productionDate) * 1000
        ).toISOString(),
        status: translateStatus(batchInfo.status),
        productImageUrls: batchInfo.productImageUrls,
        certificateImageUrl: batchInfo.certificateImageUrl,
        farmPlotNumber: batchInfo.farmPlotNumber,
        productId: batchInfo.productId,
        transportStatus: translateTransportStatus(transportStatus),
        detailedTransportStatus: translateDetailedTransportStatus(
          detailedTransportStatus
        ),
        producer: {
          name: producerInfo.name,
          address: producerInfo.address,
          phone: producerInfo.phone,
        },
        warehouseConfirmed: warehouseConfirmed,
        confirmedWarehouses: confirmedWarehouses,
      });

      console.log(
        "Serialized Batch Info:",
        JSON.stringify(serializedBatchInfo, null, 2)
      );

      // Trả về kết quả
      res.json(serializedBatchInfo);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin lô hàng từ SSCC:", error);
      res.status(500).json({ 
        error: "Không thể lấy thông tin lô hàng: " + error.message 
      });
    } finally {
      // Đảm bảo trả kết nối về pool
      if (connection) connection.release();
    }
  });

  // async function getProductInfoFromDatabase(productId) {
  //   return new Promise((resolve, reject) => {
  //     db.query(
  //       "SELECT product_id, product_name, description, price, img, uses, process FROM products WHERE product_id = ?",
  //       [productId],
  //       (error, results) => {
  //         if (error) {
  //           reject(error);
  //         } else if (results.length > 0) {
  //           resolve(results[0]);
  //         } else {
  //           resolve(null);
  //         }
  //       }
  //     );
  //   });
  // }

  async function getWarehouseInfo(warehouseId) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT name FROM users WHERE uid = ? AND role_id = 6",
        [warehouseId],
        (err, results) => {
          if (err) {
            reject(err);
          } else if (results.length > 0) {
            resolve(results[0]);
          } else {
            resolve({ name: "Unknown Warehouse" });
          }
        }
      );
    });
  }

  app.get("/api/batch-info/:batchId", async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const batchInfo = await traceabilityContract.methods
        .getBatchDetails(batchId)
        .call();
      const transportStatus = await traceabilityContract.methods
        .getBatchTransportStatus(batchId)
        .call();
      const detailedTransportStatus = await traceabilityContract.methods
        .getDetailedTransportStatus(batchId)
        .call();

      const warehouseConfirmed = await traceabilityContract.methods
        .isWarehouseConfirmed(batchId, req.session.userId)
        .call();

      // Lấy thông tin người sản xuất
      const producerInfo = await getProducerById(batchInfo.producerId);

      const serializedBatchInfo = {
        batchId: batchInfo.batchId.toString(),
        name: batchInfo.name,
        sscc: batchInfo.sscc,
        producerId: batchInfo.producerId.toString(),
        quantity: batchInfo.quantity,
        productionDate: new Date(
          Number(batchInfo.productionDate) * 1000
        ).toISOString(),
        status: translateStatus(batchInfo.status),
        productImageUrls: batchInfo.productImageUrls,
        certificateImageUrl: batchInfo.certificateImageUrl,
        farmPlotNumber: batchInfo.farmPlotNumber,
        productId: batchInfo.productId.toString(),
        transportStatus: translateTransportStatus(transportStatus),
        detailedTransportStatus: translateDetailedTransportStatus(
          detailedTransportStatus
        ),
        producer: {
          name: producerInfo.name,
          address: producerInfo.address,
          phone: producerInfo.phone,
        },
      };

      res.json(serializedBatchInfo);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin lô hàng:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy thông tin lô hàng: " + error.message });
    }
  });

  function translateDetailedTransportStatus(status) {
    const statusMap = {
      0: "Chưa bắt đầu",
      1: "Đang vận chuyển",
      2: "Đã giao",
    };
    return statusMap[status] || "Không xác định";
  }
  // Giữ nguyên các hàm translateStatus và translateTransportStatus

  app.get("/api/transport-history/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;
      const batchId = await traceabilityContract.methods
        .getBatchIdBySSCC(sscc)
        .call();
      const history = await traceabilityContract.methods
        .getTransportHistory(batchId)
        .call();

      const formattedHistory = history.map((event) => ({
        participantId: event.participantId.toString(),
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        action: event.action,
        participantType: event.participantType,
      }));

      res.json(formattedHistory);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử vận chuyển:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy lịch sử vận chuyển: " + error.message });
    }
  });

  app.post("/api/record-participation", async (req, res) => {
    try {
      const { batchId, participantType, action } = req.body;
      const userId = req.session.userId; // Giả sử bạn đang sử dụng session để lưu trữ userId

      if (!userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      // Chuyển đổi userId thành địa chỉ Ethereum
      const userAddress = await getUserEthereumAddress(userId);

      await traceabilityContract.methods
        .recordParticipation(batchId, userAddress, participantType, action)
        .send({ from: account.address, gas: 500000 });

      res.json({
        success: true,
        message: "Đã ghi nhận sự tham gia thành công",
      });
    } catch (error) {
      console.error("Lỗi khi ghi nhận sự tham gia:", error);
      res
        .status(500)
        .json({ error: "Không thể ghi nhận sự tham gia: " + error.message });
    }
  });

  app.get("/api/pending-transport-batches", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      // Lấy danh sách lô hàng chờ vận chuyển từ smart contract
      const pendingBatches = await traceabilityContract.methods
        .getPendingTransportBatches()
        .call();

      // Chuyển đổi dữ liệu và gửi về client
      const formattedBatches = pendingBatches.map((batch) => ({
        batchId: batch.batchId.toString(),
        name: batch.name,
        sscc: batch.sscc,
        quantity: batch.quantity,
        productionDate: new Date(batch.productionDate * 1000).toISOString(),
        status: translateApprovalStatus(batch.status),
        transportStatus: translateTransportStatus(batch.transportStatus),
      }));

      res.json(formattedBatches);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lô hàng chờ vận chuyển:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy danh sách lô hàng chờ vận chuyển" });
    }
  });

  app.post("/api/accept-transport", async (req, res) => {
    try {
      const { sscc, action } = req.body;
      const userId = req.session.userId;

      console.log("Received request:", { sscc, action, userId });

      if (!userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      // Kiểm tra quyền của người dùng
      const [participant] = await db.query(
        "SELECT * FROM users WHERE uid = ? AND role_id IN (8, 6)",
        [userId]
      );
      if (!participant) {
        return res
          .status(403)
          .json({
            error: "Người dùng không có quyền vận chuyển hoặc nhận hàng",
          });
      }

      // Lấy batchId từ SSCC
      const batchId = await traceabilityContract.methods
        .getBatchIdBySSCC(sscc)
        .call();
      if (!batchId) {
        return res
          .status(404)
          .json({ error: "Không tìm thấy lô hàng với SSCC này" });
      }

      // Cập nhật trạng thái vận chuyển
      await traceabilityContract.methods
        .updateTransportStatus(
          batchId,
          userId,
          action,
          participant.role_id === 6 ? "Transporter" : "Warehouse"
        )
        .send({ from: account.address, gas: 500000 });

      // Ghi nhận sự tham gia
      await traceabilityContract.methods
        .recordParticipation(
          batchId,
          userId,
          participant.role_id === 6 ? "Transporter" : "Warehouse",
          action
        )
        .send({ from: account.address, gas: 500000 });

      res.json({
        success: true,
        message:
          "Đã cập nhật trạng thái vận chuyển và ghi nhận sự tham gia thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái vận chuyển:", error);
      res
        .status(500)
        .json({
          error: "Không thể cập nhật trạng thái vận chuyển: " + error.message,
        });
    }
  });

  function translateDetailedTransportStatus(status) {
    switch (String(status)) {
      case "0":
        return "Chưa bắt đầu";
      case "1":
        return "Đang vận chuyển";
      case "2":
        return "Tạm dừng";
      case "3":
        return "Đã giao";
      default:
        return "Không xác định";
    }
  }

  function safeToString(value) {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return String(value); // Chuyển đổi tất cả các giá trị khác thành chuỗi
  }

  // Route để quét mã QR và lấy thông tin lô hàng
  app.post(
    "/api/scan-qr-and-get-batch",
    uploadQR.single("qrImage"),
    async (req, res) => {
      try {
        console.log("Đã nhận được file ảnh QR");
        if (!req.file) {
          return res
            .status(400)
            .json({ error: "Không có file ảnh được tải lên" });
        }
        const image = sharp(req.file.buffer);
        const metadata = await image.metadata();
        const buffer = await image.raw().toBuffer();

        // Tạo đối tượng qr
        const qr = new QrCode();
        const value = await new Promise((resolve, reject) => {
          qr.callback = (err, v) => (err != null ? reject(err) : resolve(v));
          qr.decode({
            width: metadata.width,
            height: metadata.height,
            data: buffer,
          });
        });

        console.log("Kết quả giải mã QR:", value);

        if (!value.result) {
          return res
            .status(400)
            .json({ error: "Không thể đọc mã QR hoặc không tìm thấy SSCC" });
        }

        const sscc = value.result.split(":")[1]; // lấy phần sau của :
        console.log("SSCC:", sscc);
        // kiểm tra sscc có hợp lệ không
        const batchInfo = await traceabilityContract.methods
          .getBatchBySSCC(sscc)
          .call();
        const isValidSSCC = batchInfo !== null;

        if (!isValidSSCC) {
          return res.status(400).json({ error: "SSCC không hợp lệ" });
        }
        const transportStatus = await traceabilityContract.methods
          .getBatchTransportStatus(batchInfo.batchId)
          .call();

        const serializedBatchInfo = safeConvert({
          batchId: batchInfo.batchId,
          name: batchInfo.name,
          sscc: batchInfo.sscc,
          producerId: batchInfo.producerId,
          quantity: batchInfo.quantity,
          productionDate: new Date(
            Number(batchInfo.productionDate) * 1000
          ).toISOString(),
          status: translateStatus(batchInfo.status),
          productImageUrls: batchInfo.productImageUrls,
          certificateImageUrl: batchInfo.certificateImageUrl,
          farmPlotNumber: batchInfo.farmPlotNumber,
          productId: batchInfo.productId,
          transportStatus: translateTransportStatus(transportStatus),
        });

        res.json(serializedBatchInfo);
      } catch (error) {
        console.error("Lỗi khi quét mã QR và lấy thông tin lô hàng:", error);
        res
          .status(500)
          .json({
            error:
              "Không thể xử lý mã QR hoặc lấy thông tin lô hàng: " +
              error.message,
          });
      }
    }
  );

  app.post("/api/accept-transport", async (req, res) => {
    try {
      const { sscc, action } = req.body;
      const userId = req.session.userId;
      const roleId = req.session.roleId;

      console.log("Received request:", { sscc, action, userId, roleId });

      if (!userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      // Kiểm tra quyền của người dùng
      const [participant] = await db.query(
        "SELECT * FROM users WHERE uid = ? AND role_id IN (6, 8)",
        [userId]
      );
      if (!participant) {
        return res
          .status(403)
          .json({
            error: "Người dùng không có quyền vận chuyển hoặc nhận hàng",
          });
      }

      let participantType;
      if (roleId === 6) {
        console.log("roleId của người vận chuyển :", roleId);
        participantType = "Transporter"; // Thay đổi từ 0 thành "Transporter"
      } else if (roleId === 8) {
        console.log("roleId của nhà kho:", roleId);
        participantType = "Warehouse"; // Thay đổi từ 1 thành "Warehouse"
      } else {
        return res
          .status(403)
          .json({
            error: "Người dùng không có quyền vận chuyển hoặc nhận hàng",
          });
      }
      console.log("roleId:", roleId);
      console.log("participantType:", participantType);
      console.log("Session roleId:", req.session.roleId);

      const batchId = await traceabilityContract.methods
        .getBatchIdBySSCC(sscc)
        .call();

      if (!batchId) {
        return res
          .status(404)
          .json({ error: "Không tìm thấy lô hàng với SSCC này" });
      }

      console.log("Before calling updateTransportStatus:", {
        batchId,
        userId,
        action,
        participantType,
      });
      await traceabilityContract.methods
        .updateTransportStatus(batchId, userId, action, participantType)
        .send({ from: account.address, gas: 500000 });
      console.log("After calling updateTransportStatus:", result);
      // Lấy batchId từ SSCC

      console.log("Updating transport status with:", {
        batchId,
        userId,
        action,
        participantType,
      });

      // Cập nhật trạng thái vận chuyển
      await traceabilityContract.methods
        .updateTransportStatus(batchId, userId, action, participantType)
        .send({ from: account.address, gas: 500000 });

      res.json({
        success: true,
        message: "Đã cập nhật trạng thái vận chuyển thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái vận chuyển:", error);
      res
        .status(500)
        .json({
          error: "Không thể cập nhật trạng thái vận chuyển: " + error.message,
        });
    }
  });

  function translateTransportStatus(status) {
    switch (String(status)) {
      case "0":
        return "Chưa vận chuyển";
      case "1":
        return "Đang vận chuyển";
      case "2":
        return "Đã vận chuyển";
      default:
        return "Không xác định";
    }
  }

  app.get("/api/check-session", (req, res) => {
    if (req.session.userId) {
      res.json({ loggedIn: true, userId: req.session.userId });
    } else {
      res.json({ loggedIn: false });
    }
  });

  function translateStatus(status) {
    console.log("Status before translation:", status, "Type:", typeof status);

    // Xử lý trường hợp status là chuỗi
    if (typeof status === "string") {
      switch (status) {
        case "PendingApproval":
          return "Chờ phê duyệt";
        case "Approved":
          return "Đã phê duyệt";
        case "Rejected":
          return "Đã từ chối";
      }
    }

    // Xử lý trường hợp status là số hoặc BigInt
    let statusNumber = status;
    if (typeof status === "bigint") {
      statusNumber = Number(status);
    } else if (typeof status === "string") {
      statusNumber = parseInt(status, 10);
    }

    console.log(
      "Status after conversion:",
      statusNumber,
      "Type:",
      typeof statusNumber
    );

    switch (statusNumber) {
      case 0:
        return "Chờ phê duyệt";
      case 1:
        return "Đã phê duyệt";
      case 2:
        return "Đã từ chối";
      default:
        console.log("Unrecognized status:", status);
        return "Không xác định";
    }
  }

  app.get("/api/batch-transport-history/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;

      const transportHistory = await traceabilityContract.methods
        .getTransportHistoryBySSCC(sscc)
        .call();
      console.log("Transport History from blockchain:", transportHistory);

      const enrichedHistory = await Promise.all(
        transportHistory.map(async (event) => {
          console.log("Querying for participantId:", event.participantId);
          let transporter;
          try {
            const [results] = await db.query(
              `
          SELECT u.name, u.phone, u.address, 
                 p.province_name, d.district_name, w.ward_name
          FROM users u
          LEFT JOIN provinces p ON u.province_id = p.province_id
          LEFT JOIN districts d ON u.district_id = d.district_id
          LEFT JOIN wards w ON u.ward_id = w.ward_id
          WHERE u.uid = ?
        `,
              [event.participantId.toString()]
            );

            transporter = results[0];
          } catch (dbError) {
            console.error("Database query error:", dbError);
            transporter = null;
          }

          const enrichedEvent = {
            action: translateAction(event.action.toString()),
            timestamp: new Date(
              parseInt(event.timestamp) * 1000
            ).toLocaleString("vi-VN"),
            participantType: translateParticipantType(
              event.participantType.toString()
            ),
            transporterName: transporter
              ? transporter.name
              : "Không có thông tin",
            transporterPhone: transporter
              ? transporter.phone
              : "Không có thông tin",
            transporterAddress: transporter
              ? [
                  ...new Set([
                    transporter.address,
                    transporter.ward_name,
                    transporter.district_name,
                    transporter.province_name,
                  ]),
                ]
                  .filter(Boolean)
                  .join(", ")
              : "Không có thông tin",
          };

          console.log("Enriched event:", enrichedEvent);
          return enrichedEvent;
        })
      );

      console.log("Enriched Transport History:", enrichedHistory);
      res.json(enrichedHistory);
    } catch (error) {
      console.error("Error fetching transport history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  function translateAction(action) {
    const actions = {
      "Bat dau van chuyen": "Bắt đầu vận chuyển",
      "Tam dung van chuyen": "Tạm dừng vận chuyển",
      "Tiep tuc van chuyen": "Tiếp tục vận chuyển",
      "Hoan thanh van chuyen": "Hoàn thành vận chuyển",
    };
    return actions[action] || action;
  }

  function translateParticipantType(type) {
    const types = {
      Transporter: "Người vận chuyển",
      Warehouse: "Kho",
    };
    return types[type] || type;
  }
  app.post("/api/warehouse-confirm", async (req, res) => {
    try {
      const { sscc } = req.body;
      console.log("Received warehouse confirmation request for SSCC:", sscc);

      const batchId = await traceabilityContract.methods
        .getBatchIdBySSCC(sscc)
        .call();
      console.log("Batch ID:", batchId);

      const userId = req.session.userId;
      console.log("User ID:", userId);

      console.log("Using admin address:", adminAddress);

      const result = await traceabilityContract.methods
        .warehouseConfirmation(batchId, userId)
        .send({
          from: adminAddress,
          gas: 500000, // Điều chỉnh gas nếu cần
        });
      console.log("Transaction result:", result);

      res
        .status(200)
        .json({
          message: "Xác nhận nhận hàng thành công",
          transactionHash: result.transactionHash,
        });
    } catch (error) {
      console.error("Error in warehouse confirmation:", error);
      res
        .status(500)
        .json({
          error: "Có lỗi xảy ra khi xác nhận nhận hàng: " + error.message,
        });
    }
  });
  // Thêm event listener bên ngoài route handler
  traceabilityContract.events.WarehouseConfirmed({}, (error, event) => {
    if (error) {
      console.error("Error on WarehouseConfirmed event:", error);
    } else {
      console.log("WarehouseConfirmed event:", event.returnValues);
    }
  });
  // Hàm hỗ trợ để lấy role của người dùng
  async function getUserRole(userId) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT role_id FROM users WHERE uid = ?",
        [userId],
        (error, results) => {
          if (error) {
            reject(error);
          } else if (results.length > 0) {
            resolve(results[0].role_id);
          } else {
            reject(new Error("User not found"));
          }
        }
      );
    });
  }

  app.get("/api/batch-activity-logs/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;
      const activityLogs = await activityLogContract.methods
        .getBatchActivityLogsBySSCC(sscc)
        .call();
      res.json(activityLogs);
    } catch (error) {
      console.error("Lỗi khi lấy nhật ký hoạt động của lô hàng:", error);
      res
        .status(500)
        .json({
          error:
            "Không thể lấy nhật ký hoạt động của lô hàng: " + error.message,
        });
    }
  });
  app.get("/api/system-activity-logs/:sscc", async (req, res) => {
    try {
      const sscc = req.params.sscc;
      console.log(
        "Đang truy xuất nhật ký hoạt động của hệ thống cho SSCC:",
        sscc
      );

      const batchId = await traceabilityContract.methods
        .getBatchIdBySSCC(sscc)
        .call();
      if (batchId == 0) {
        return res
          .status(404)
          .json({ error: "Batch không tồn tại với SSCC này" });
      }

      const systemActivityLogs = await activityLogContract.methods
        .getSystemActivityLogs(batchId)
        .call();
      console.log(
        "Số lượng nhật ký hoạt động của hệ thống:",
        systemActivityLogs.length
      );

      const convertedLogs = convertBigIntToString(systemActivityLogs);
      const formattedLogs = await Promise.all(
        convertedLogs.map(async (log) => {
          const participantInfo = await getParticipantInfo(log.participantId);
          return {
            timestamp: new Date(Number(log.timestamp) * 1000).toISOString(),
            participantId: log.participantId,
            participantInfo: participantInfo,
            activityName: log.activityName,
            description: log.description,
            imageUrls: log.imageUrls,
            relatedProductIds: log.relatedProductIds.map(String),
          };
        })
      );

      let producerId = null;
      const participantsMap = new Map();
      formattedLogs.forEach((log) => {
        if (log.activityName === "Batch Created") {
          producerId = log.participantId;
        }
        if (log.participantInfo) {
          participantsMap.set(log.participantId, log.participantInfo);
        }
      });

      const response = {
        message: "Truy xuất nhật ký hoạt động của hệ thống thành công",
        batchId: String(batchId),
        producerId: producerId,
        participants: Array.from(participantsMap.values()),
        activityLogs: formattedLogs,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Lỗi khi truy xuất nhật ký hoạt động của hệ thống:", error);
      res
        .status(500)
        .json({
          error:
            "Lỗi khi truy xuất nhật ký hoạt động của hệ thống: " +
            error.message,
        });
    }
  });
  async function getParticipantInfo(participantId) {
    try {
      const [participant] = await db.query(
        `
      SELECT u.uid, u.name, u.phone, u.address, u.avatar, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.uid = ?
    `,
        [participantId]
      );

      if (participant.length > 0) {
        return {
          id: participant[0].uid,
          name: participant[0].name,
          phone: participant[0].phone,
          address: participant[0].address,
          avatar: participant[0].avatar, // Trả về URL avatar như được lưu trong cơ sở dữ liệu
          role: participant[0].role_name,
        };
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi lấy thông tin người tham gia:", error);
      return null;
    }
  }
  // Hàm hỗ trợ để chuyển đổi BigInt thành string
  function convertBigIntToString(obj) {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(convertBigIntToString);
    }

    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === "bigint") {
          result[key] = value.toString();
        } else if (typeof value === "object") {
          result[key] = convertBigIntToString(value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  app.get("/api/producer-activity-logs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Người dùng chưa đăng nhập" });
      }

      const producerId = req.session.userId;
      console.log(
        "Đang truy xuất nhật ký hoạt động của người sản xuất cho producerId:",
        producerId
      );

      const producerActivityLogs = await traceabilityContract.methods
        .getProducerActivityLogsByProducerId(producerId)
        .call();
      console.log(
        "Số lượng nhật ký hoạt động của người sản xuất:",
        producerActivityLogs.length
      );

      const convertedLogs = convertBigIntToString(producerActivityLogs);
      const formattedLogs = await Promise.all(
        convertedLogs.map(async (log) => {
          const relatedProducts = await getRelatedProducts(
            log.relatedProductIds
          );
          return {
            timestamp: new Date(Number(log.timestamp) * 1000).toISOString(),
            uid: log.uid,
            activityName: log.activityName,
            description: log.description,
            isSystemGenerated: log.isSystemGenerated,
            imageUrls: log.imageUrls,
            relatedProducts: relatedProducts,
          };
        })
      );

      formattedLogs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      console.log("Raw producer activity logs:", producerActivityLogs);
      console.log("Converted logs:", convertedLogs);
      console.log("Formatted logs:", formattedLogs);

      res.status(200).json({
        message: "Truy xuất nhật ký hoạt động của người sản xuất thành công",
        activityLogs: formattedLogs,
      });
    } catch (error) {
      console.error(
        "Lỗi khi truy xuất nhật ký hoạt động của người sản xuất:",
        error
      );
      res
        .status(500)
        .json({
          error:
            "Lỗi khi truy xuất nhật ký hoạt động của người sản xuất: " +
            error.message,
        });
    }
  });

  async function getRelatedProducts(productIds) {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    const products = await Promise.all(
      productIds.map(async (productId) => {
        const product = await getProductById(productId);
        return product;
      })
    );

    return products.filter((product) => product !== null);
  }

  async function getProductById(productId) {
    try {
      const [results] = await db.query(
        "SELECT product_id, product_name, image_url FROM products WHERE product_id = ?",
        [productId]
      );
      if (results.length > 0) {
        const product = results[0];
        // Nếu không có image_url trong database, lấy từ blockchain
        if (!product.image_url) {
          const productFromBlockchain = await traceabilityContract.methods
            .getProductById(productId)
            .call();
          product.image_url = productFromBlockchain.imageUrl;
        }
        return product;
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi truy vấn sản phẩm:", error);
      return null;
    }
  }

  app.get("/api/activity-logs/:uid", async (req, res) => {
    try {
      const producerId = req.params.uid;
      console.log(
        "Đang truy xuất nhật ký hoạt động của người sản xuất cho producerId:",
        producerId
      );

      const producerActivityLogs = await traceabilityContract.methods
        .getProducerActivityLogsByProducerId(producerId)
        .call();
      console.log(
        "Số lượng nhật ký hoạt động của người sản xuất:",
        producerActivityLogs.length
      );

      const convertedLogs = convertBigIntToString(producerActivityLogs);
      const formattedLogs = await Promise.all(
        convertedLogs.map(async (log) => {
          const relatedProducts = await getRelatedProducts(
            log.relatedProductIds
          );
          return {
            timestamp: new Date(Number(log.timestamp) * 1000).toISOString(),
            uid: log.uid,
            activityName: log.activityName,
            description: log.description,
            isSystemGenerated: log.isSystemGenerated,
            imageUrls: log.imageUrls || [],
            relatedProducts: relatedProducts.map((product) => ({
              product_id: product.product_id,
              product_name: product.product_name,
              image_url: product.image_url,
            })),
          };
        })
      );

      res.status(200).json({
        message: "Truy xuất nhật ký hoạt động của người sản xuất thành công",
        activityLogs: formattedLogs,
      });
    } catch (error) {
      console.error(
        "Lỗi khi truy xuất nhật ký hoạt động của người sản xuất:",
        error
      );
      res
        .status(500)
        .json({
          error:
            "Lỗi khi truy xuất nhật ký hoạt động của người sản xuất: " +
            error.message,
        });
    }
  });

  async function getRelatedProducts(productIds) {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    const products = await Promise.all(
      productIds.map(async (productId) => {
        const product = await getProductById(productId);
        return product;
      })
    );

    return products.filter((product) => product !== null);
  }

  async function getProductById(productId) {
    try {
      const [results] = await db.query(
        "SELECT product_id, product_name, img FROM products WHERE product_id = ?",
        [productId]
      );
      if (results.length > 0) {
        return {
          product_id: results[0].product_id,
          product_name: results[0].product_name,
          image_url: results[0].img,
        };
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi truy vấn sản phẩm:", error);
      return null;
    }
  }

  app.get("/api/users-home", async (req, res) => {
    try {
      const [users] = await db.query(`
          SELECT u.uid, u.name, u.avatar, r.role_name, rg.region_name
          FROM users u
          JOIN roles r ON u.role_id = r.role_id
          LEFT JOIN regions rg ON u.region_id = rg.region_id
      `);
      res.status(200).json(users);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      res
        .status(500)
        .json({
          error: "Không thể lấy danh sách người dùng: " + error.message,
        });
    }
  });

  app.get("/api/products-home", async (req, res) => {
    try {
      const [products] = await db.query(
        "SELECT product_id, product_name, img FROM products"
      );
      res.status(200).json(products);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy danh sách sản phẩm: " + error.message });
    }
  });
  app.get("/api/user/:uid", async (req, res) => {
    try {
      const userId = req.params.uid;
      const [user] = await db.query(
        `
          SELECT u.uid, u.name, u.phone, u.address, u.avatar, rg.region_name
          FROM users u
          LEFT JOIN regions rg ON u.region_id = rg.region_id
          WHERE u.uid = ?
      `,
        [userId]
      );

      if (user.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }

      res.status(200).json(user[0]);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin chi tiết người dùng:", error);
      res
        .status(500)
        .json({
          error:
            "Không thể lấy thông tin chi tiết người dùng: " + error.message,
        });
    }
  });

  app.get("/api/product/:productId", async (req, res) => {
    try {
      const productId = req.params.productId;
      const [results] = await db.query(
        "SELECT product_id, product_name, description, price, img, uses, process FROM products WHERE product_id = ?",
        [productId]
      );

      if (results.length > 0) {
        res.status(200).json(results[0]);
      } else {
        res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin sản phẩm:", error);
      res
        .status(500)
        .json({ error: "Không thể lấy thông tin sản phẩm: " + error.message });
    }
  });

  app.get('/api/config', (req, res) => {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({ baseUrl });
  });

  // Thêm route để serve static files
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
}

module.exports = {
  web3,
  traceabilityContract,
  activityLogContract,
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
  convertBigIntToString, // dùng để chuyển đổi bigInt sang string, do lỗi in ra số lớn
  BUCKET_NAME,
};
