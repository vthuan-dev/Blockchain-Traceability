const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require('multer');
const express = require('express');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const mysql = require('mysql');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const app = express();
const storage = multer.memoryStorage();

const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000
});
db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
    return;
  }
  console.log('Đã kết nối cơ sở dữ liệu');
});



const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const account = web3.eth.accounts.privateKeyToAccount('0xe9437cabf0c3b29aac95c0338c1177a53f6a2487e15480d959f37cb1597b5795');
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address

web3.eth.net.isListening()
  .then(() => console.log('Đã kết nối với ETH node'))
  .catch(e => console.log('Lỗi rồi', e));

const contractABI = require('../build/contracts/TraceabilityContract.json').abi;
const contractAddress = '0xfDBB2490e6fabC5d889FbE0Dcc556157648b118a';
const contract = new web3.eth.Contract(contractABI, contractAddress);

// tạo biến lưu trữ file, giới hạn số lượng file và tên file, maxCount: số lượng file, name: tên file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'certificateImage', maxCount: 1 }
]);

const activityUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).array('imageUrls', 5); // Thay đổi 'activityImages' thành 'imageUrls'



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { CID } = require('multiformats/cid');
const { sha256 } = require('multiformats/hashes/sha2');
const { base58btc } = require('multiformats/bases/base58');

const BUCKET_NAME = 'truyxuat';

async function uploadFile(fileBuffer, fileName) {
  try {
    console.log(`Bắt đầu tải lên Filebase: ${fileName}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`Tải lên thành công: ${fileName}`);
    
    return await checkFileStatusWithRetry(fileName);
  } catch (error) {
    console.error('Lỗi khi tải lên Filebase:', error);
    throw error;
  }
}
function convertBigIntToString(item) {
  if (typeof item === 'bigint') {
    return item.toString();
  }
  if (Array.isArray(item)) {
    return item.map(convertBigIntToString);
  }
  if (typeof item === 'object' && item !== null) {
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, convertBigIntToString(value)])
    );
  }
  return item;
}
function translateStatus(status) {
  const statusTranslations = {
    'PendingApproval': 'Chờ phê duyệt',
    'Approved': 'Đã phê duyệt',
    'Rejected': 'Đã từ chối'
  };
  return statusTranslations[status] || status;
}

async function checkFileStatusWithRetry(fileName, maxRetries = 5, retryDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileName
      };

      const command = new HeadObjectCommand(params);
      const result = await s3Client.send(command);
      console.log('Thông tin file:', result);
      console.log(`Trạng thái file: Tồn tại`);
      
      const cid = result.Metadata.cid;
      console.log(`CID từ Filebase: ${cid}`);
      
      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
      console.log(`IPFS URL: ${ipfsUrl}`);
      
      return { cid, ipfsUrl };
    } catch (error) {
      if (error.name !== 'NotFound') {
        console.error('Lỗi khi kiểm tra trạng thái:', error);
        throw error;
      }
      if (i < maxRetries - 1) {
        console.log(`File chưa sẵn sàng, thử lại sau ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.log(`Trạng thái file: Không tồn tại sau ${maxRetries} lần thử`);
        throw new Error('File không tồn tại sau nhiều lần thử');
      }
    }
  }
}
async function processFiles(files) {
  const processedFiles = {};

  if (!files.productImages || !Array.isArray(files.productImages) || files.productImages.length === 0) {
    throw new Error('Thiếu ảnh lô hàng');
  }

  processedFiles.productImages = [];
  for (const file of files.productImages) {
    const result = await uploadFile(file.buffer, file.originalname);
    processedFiles.productImages.push(result.ipfsUrl);
    console.log(`Đã xử lý ảnh sản phẩm: ${result.ipfsUrl}`);
  }

  if (files.certificateImage && files.certificateImage[0]) {
    const certificateFile = files.certificateImage[0];
    const result = await uploadFile(certificateFile.buffer, certificateFile.originalname);
    processedFiles.certificateImage = result.ipfsUrl;
    console.log(`Đã xử lý ảnh chứng nhận: ${result.ipfsUrl}`);
  } else {
    processedFiles.certificateImage = 'default_certificate_image_url';
  }

  return processedFiles;
}

function replacer(key, value) {
  if (typeof value === 'bigint') {
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

app.use(express.urlencoded({ extended: true }));

async function checkUserExists(userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE uid = ?', [userId], (error, results) => {
      if (error) return reject(error);
      resolve(results.length > 0);
    });
  });
}

async function checkProductExists(productId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM products WHERE product_id = ?', [productId], (error, results) => {
      if (error) return reject(error);
      resolve(results.length > 0);
    });
  });
}

async function getProducerById(producerId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE uid = ?', [producerId], (error, results) => {
      if (error) {
        console.error('Lỗi truy vấn cơ sở dữ liệu:', error);
        reject(error);
      } else if (results.length > 0) {
        console.log(`Thông tin nhà sản xuất cho UID ${producerId}:`, results[0]);
        resolve(results[0]);
      } else {
        console.log(`Không tìm thấy nhà sản xuất cho UID ${producerId}`);
        reject(new Error(`Không tìm thấy nhà sản xuất cho UID ${producerId}`));
      }
    });
  });
}

function setupRoutes(app, db){
  app.get('/batches/:producerId', async (req, res) => {
    try {
      const producerId = parseInt(req.params.producerId, 10);
  
      if (isNaN(producerId) || producerId <= 0) {
        return res.status(400).send('Producer ID không hợp lệ');
      }
  
      const batches = await contract.methods.getBatchesByProducer(producerId).call();
      const serializedBatches = convertBigIntToString(batches);
      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error('Error fetching batches:', err);
      res.status(500).send('Lỗi khi lấy danh sách lô hàng: ' + err.message);
    }
  });
  
  app.get('/activity-logs/:uid', async (req, res) => {
    try {
      const uid = req.params.uid;
      
      console.log('Đang truy xuất nhật ký hoạt động cho UID:', uid);
  
      const activityLogs = await contract.methods.getActivityLogs(uid).call();
      
      console.log('Số lượng nhật ký hoạt động:', activityLogs.length);
  
      // Chuyển đổi tất cả giá trị BigInt thành chuỗi
      const convertedLogs = convertBigIntToString(activityLogs);
  
      // Chuyển đổi dữ liệu để dễ đọc hơn
      const formattedLogs = convertedLogs.map(log => ({
        timestamp: new Date(Number(log.timestamp) * 1000).toISOString(),
        uid: log.uid,
        activityName: log.activityName,
        description: log.description,
        isSystemGenerated: log.isSystemGenerated,
        imageUrls: log.imageUrls,
        relatedProductIds: log.relatedProductIds
      }));
  
      res.status(200).json({
        message: 'Truy xuất nhật ký hoạt động thành công',
        activityLogs: formattedLogs
      });
    } catch (error) {
      console.error('Lỗi khi truy xuất nhật ký hoạt động:', error);
      res.status(500).json({ error: 'Lỗi khi truy xuất nhật ký hoạt động: ' + error.message });
    }
  });
  
  app.get('/create-batch', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'themlohang.html'));
  });
  
  app.post('/checkdata', upload, (req, res) => {
    res.status(200).send({
      body: req.body,
      files: req.files
    });
  });
  
  app.post('/createbatch', (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // Lỗi Multer
        return res.status(400).json({ error: 'Lỗi upload file: ' + err.message });
      } else if (err) {
        // Lỗi không xác định
        return res.status(500).json({ error: 'Lỗi server: ' + err.message });
      }
      // Nếu không có lỗi, tiếp tục xử lý
      next();
    });
  }, async (req, res) => {
    console.log('Received body:', req.body);
    console.log('Received files:', req.files);
  
    try {
      const { name, quantity, farmPlotNumber, productId, producerId, startDate, endDate } = req.body;
  
      // Kiểm tra các trường bắt buộc
      if (!name || !quantity || !farmPlotNumber || !productId || !producerId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
      }
  
      // Kiểm tra và chuyển đổi các giá trị số
      const cleanProductId = parseInt(productId, 10);
      const cleanProducerId = parseInt(producerId, 10);
      const cleanStartDate = new Date(startDate).getTime() / 1000;
      const cleanEndDate = new Date(endDate).getTime() / 1000;
  
      if (isNaN(cleanProductId) || cleanProductId <= 0) {
        return res.status(400).json({ error: 'Product ID không hợp lệ' });
      }
      if (isNaN(cleanProducerId) || cleanProducerId <= 0) {
        return res.status(400).json({ error: 'Producer ID không hợp lệ' });
      }
  
      if (isNaN(cleanStartDate) || cleanStartDate <= 0) {
        return res.status(400).json({ error: 'Ngày bắt đầu không hợp lệ' });
      }
      if (isNaN(cleanEndDate) || cleanEndDate <= 0) {
        return res.status(400).json({ error: 'Ngày kết thúc không hợp lệ' });
      }
      if (cleanStartDate >= cleanEndDate) {
        return res.status(400).json({ error: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }
  
      // Kiểm tra sự tồn tại của userId và productId trong MySQL
      const userExists = await checkUserExists(cleanProducerId);
      const productExists = await checkProductExists(cleanProductId);
  
      if (!userExists) {
        return res.status(400).json({ error: 'Producer ID không tồn tại' });
      }
      if (!productExists) {
        return res.status(400).json({ error: 'Product ID không tồn tại' });
      }
  
      let productImageUrls = [];
  
      // Xử lý productImages
      if (req.files && req.files['productImages'] && req.files['productImages'].length > 0) {
        console.log(`Số lượng ảnh sản phẩm nhận được: ${req.files['productImages'].length}`);
        
        for (const file of req.files['productImages']) {
          try {
            const result = await uploadFile(file.buffer, file.originalname);
            productImageUrls.push(result.ipfsUrl);
            console.log(`Đã thêm URL ảnh sản phẩm: ${result.ipfsUrl}`);
          } catch (uploadError) {
            console.error(`Lỗi khi tải lên ảnh ${file.originalname}:`, uploadError);
          }
        }
        
        console.log(`Tổng số URL ảnh sản phẩm sau khi xử lý: ${productImageUrls.length}`);
      } else {
        console.log('Không có ảnh sản phẩm được gửi lên');
        return res.status(400).json({ error: 'Thiếu ảnh sản phẩm' });
      }
  
      let certificateImageUrl = '';
  
      // Xử lý certificateImage (nếu có)
      if (req.files['certificateImage'] && req.files['certificateImage'][0]) {
        const certificateImageFile = req.files['certificateImage'][0];
        const certificateImageResult = await uploadFile(certificateImageFile.buffer, certificateImageFile.originalname);
        certificateImageUrl = certificateImageResult.ipfsUrl;
        console.log('Certificate image uploaded:', certificateImageUrl);
      } else {
        console.log('Không có ảnh chứng nhận được tải lên');
        certificateImageUrl = 'default_certificate_image_url';
      }
  
      // Trước khi gọi createBatch
      console.log('productImageUrls trước khi gọi createBatch:', productImageUrls);
  
      // Gọi hàm createBatch của smart contract
      const result = await contract.methods.createBatch(
        name,  // Thêm tên lô hàng
        cleanProducerId,
        quantity,
        productImageUrls,
        certificateImageUrl,
        farmPlotNumber,
        cleanProductId,
        cleanStartDate,
        cleanEndDate
      ).send({ from: account.address, gas: 3000000 });
  
      // Chuyển đổi kết quả thành chuỗi JSON
      const safeResult = JSON.parse(JSON.stringify(result, replacer));
      console.log('Number of product images:', req.files['productImages'] ? req.files['productImages'].length : 0);
  
      res.status(200).json({
        message: 'Lô hàng đã được tạo thành công và đang chờ phê duyệt',
        batchId: safeResult.events.BatchCreated.returnValues.batchId,
        status: 'PendingApproval'
      });
    } catch (err) {
      console.error('Error creating batch:', err);
      res.status(500).json({ error: 'Lỗi khi tạo lô hàng: ' + err.message });
    }
  });
  
  app.get('/create-activity', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'themnkhd.html'));
  });
  
  app.post('/createactivity', (req, res, next) => {
    activityUpload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // Lỗi Multer
        return res.status(400).json({ error: 'Lỗi upload file: ' + err.message });
      } else if (err) {
        // Lỗi không xác định
        return res.status(500).json({ error: 'Lỗi server: ' + err.message });
      }
      // Nếu không có lỗi, tiếp tục xử lý
      next();
    });
  }, async (req, res) => {
    try {
      console.log('Received body:', req.body);
      console.log('Received files:', req.files);
  
      // Làm sạch các key trong req.body
      const cleanBody = Object.keys(req.body).reduce((acc, key) => {
        acc[key.trim()] = req.body[key];
        return acc;
      }, {});
  
      const { uid, activityName, description, relatedProductIds } = cleanBody;
  
      // Validate input
      if (!uid || !activityName || !description) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
      }
  
      // Kiểm tra xem người dùng có tồn tại trong cơ sở dữ liệu không
      const userExists = await checkUserExists(uid);
      if (!userExists) {
        return res.status(400).json({ error: 'Người dùng không tồn tại' });
      }
  
      // Chuyển đổi relatedProductIds thành mảng số nguyên
      const productIds = Array.isArray(relatedProductIds) 
        ? relatedProductIds.map(id => parseInt(id, 10))
        : relatedProductIds ? [parseInt(relatedProductIds, 10)] : [];
  
      // Kiểm tra xem tất cả các sản phẩm liên quan có tồn tại trong cơ sở dữ liệu không
      if (productIds.length > 0) {
        for (const productId of productIds) {
          const productExists = await checkProductExists(productId);
          if (!productExists) {
            return res.status(400).json({ error: `Sản phẩm với ID ${productId} không tồn tại` });
          }
        }
      }
  
      let imageUrls = [];
  
      // Process activity images
      if (req.files && req.files.length > 0) {
        console.log(`Số ảnh nhận được: ${req.files.length}`);
        
        for (const file of req.files) {
          try {
            const result = await uploadFile(file.buffer, file.originalname);
            imageUrls.push(result.ipfsUrl);
            console.log(`Đã thêm URL ảnh hoạt động: ${result.ipfsUrl}`);
          } catch (uploadError) {
            console.error(`Lỗi khi tải lên ảnh ${file.originalname}:`, uploadError);
          }
        }
        
        console.log(`Tổng số URL ảnh hoạt động sau khi xử lý: ${imageUrls.length}`);
      } else {
        console.log('Không có ảnh hoạt động được tải lên');
      }
  
      // Kiểm tra phiên bản của smart contract
      const networkId = await web3.eth.net.getId();
      console.log('Network ID:', networkId);
  
      // Kiểm tra số dư của tài khoản
      const balance = await web3.eth.getBalance(account.address);
      console.log('Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
  
      // Kiểm tra số lượng nhật ký hoạt động hiện tại
      const currentLogCount = await contract.methods.getActivityLogCount(parseInt(uid, 10)).call();
      console.log('Current activity log count:', currentLogCount);
  
      // Thử gọi một hàm đơn giản
      try {
        const totalBatches = await contract.methods.getTotalBatches().call();
        console.log('Total batches:', totalBatches);
      } catch (error) {
        console.error('Error calling getTotalBatches:', error);
      }
  
      // Sau đó mới gọi addActivityLog
      try {
        console.log('Bắt đầu gọi hàm addActivityLog');
        const gasEstimate = await contract.methods.addActivityLog(
          parseInt(uid, 10),
          activityName,
          description,
          imageUrls,
          productIds
        ).estimateGas({ from: account.address });
        
        console.log('Ước tính gas:', gasEstimate);
  
        const result = await contract.methods.addActivityLog(
          parseInt(uid, 10),
          activityName,
          description,
          imageUrls,
          productIds
        ).send({ 
          from: account.address, 
          gas: Math.floor(Number(gasEstimate) * 1.5).toString()
        });
        console.log('Kết quả giao dịch:', result);
        if (result.events && result.events.ActivityLogAdded) {
          console.log('Event ActivityLogAdded:', result.events.ActivityLogAdded.returnValues);
        } else {
          console.log('Không tìm thấy event ActivityLogAdded');
        }
        
        // Kiểm tra lại số lượng nhật ký sau khi thêm
        const newLogCount = await contract.methods.getActivityLogCount(parseInt(uid, 10)).call();
        console.log('New activity log count:', newLogCount);
        
        res.status(200).json({
          message: 'Nhật ký hoạt động đã được thêm thành công',
          transactionHash: result.transactionHash,
          imageUrls: imageUrls
        });
      } catch (error) {
        console.error('Chi tiết lỗi:', error);
        if (error.message.includes('revert')) {
          console.error('Lỗi revert:', error.message);
          // Thử lấy thông tin lỗi chi tiết từ smart contract
          try {
            const revertReason = await web3.eth.call(error.receipt);
            console.error('Lý do revert:', revertReason);
          } catch (callError) {
            console.error('Không thể lấy lý do revert:', callError);
          }
        }
        res.status(500).json({ error: 'Lỗi thêm nhật ký hoạt động: ' + error.message });
      }
  
    } catch (error) {
      console.error('Lỗi thêm nhật ký hoạt động:', error);
      res.status(500).json({ error: 'Lỗi thêm nhật ký hoạt động: ' + error.message });
    }
  });


  app.get('/pending-batches', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Người dùng chưa đăng nhập' });
      }
  
      const producerId = req.session.userId;
      const pendingBatches = await contract.methods.getPendingBatchesByProducer(producerId).call();
      
      // Chuyển đổi trạng thái từ số sang chuỗi và dịch sang tiếng Việt
      const statusMap = ['PendingApproval', 'Approved', 'Rejected'];
      
      const serializedBatches = pendingBatches.map(batch => ({
        ...convertBigIntToString(batch),
        status: translateStatus(statusMap[batch.status] || 'Unknown'),
        productImageUrls: batch.productImageUrls,
        certificateImageUrl: batch.certificateImageUrl
      }));
  
      res.status(200).json(serializedBatches);
    } catch (err) {
      console.error('Error fetching pending batches for producer:', err);
      res.status(500).json({ error: 'Lỗi khi lấy danh sách lô hàng đang chờ kiểm duyệt: ' + err.message });
    }
  });


}
module.exports = {
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
  convertBigIntToString,  // dùng để chuyển đổi bigInt sang string, do lỗi in ra số lớn

  BUCKET_NAME
};
