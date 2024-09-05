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

// tạo biến lưu trữ file, giới hạn số lượng file và tên file, maxCount: số lượng file, name: tên file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'certificateImage', maxCount: 1 }
]);
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

  if (!files.images || !Array.isArray(files.images) || files.images.length === 0) {
    throw new Error('Thiếu ảnh lô hàng');
  }

  for (const fieldName in files) {
    if (Array.isArray(files[fieldName])) {
      processedFiles[fieldName] = [];
      for (const file of files[fieldName]) {
        const url = await uploadFile(file.buffer, file.originalname);
        processedFiles[fieldName].push(url);
      }
    } else {
      const file = files[fieldName];
      const url = await uploadFile(file.buffer, file.originalname);
      processedFiles[fieldName] = url;
    }
  }

  return processedFiles;
}

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const account = web3.eth.accounts.privateKeyToAccount('0xe9437cabf0c3b29aac95c0338c1177a53f6a2487e15480d959f37cb1597b5795');
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address

web3.eth.net.isListening()
  .then(() => console.log('Đã kết nối với ETH node'))
  .catch(e => console.log('Lỗi rồi', e));

const contractABI = require('../build/contracts/TraceabilityContract.json').abi;
const contractAddress = '0xBE979b1780C3564843F338ECA1ab2a5B382711C4';
const contract = new web3.eth.Contract(contractABI, contractAddress);

function replacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}



// const fromAccount = '0x84c7cFF56f736B372b64888c6Ad9D90c4F13d184'; // Thay thế bằng địa chỉ tài khoản có đủ ETH trong Ganache
// const toAccount = '0xB5b37722018951f460Bf2435C472E95BaFD89906'; // Thay thế bằng địa chỉ tài khoản của bạn

// // Chuyển ETH ảo
// web3.eth.sendTransaction({
//   from: fromAccount,
//   to: toAccount,
//   value: web3.utils.toWei('100', 'ether') // Số lượng ETH bạn muốn nạp
// })
// .then(receipt => {
//   console.log('Giao dịch thành công:', receipt);
// })
// .catch(error => {
//   console.error('Lỗi khi chuyển ETH:', error);
// });



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

app.get('/batches/:producerId', async (req, res) => {
  try {
    const producerId = parseInt(req.params.producerId, 10);

    if (isNaN(producerId) || producerId <= 0) {
      return res.status(400).send('Producer ID không hợp lệ');
    }

    const batches = await contract.methods.getBatchesByProducer(producerId).call();
    res.status(200).send(batches);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).send('Lỗi khi lấy danh sách lô hàng: ' + err.message);
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


app.post('/createbatch', upload, async (req, res) => {
  console.log('Received body:', req.body);
  console.log('Received files:', req.files);

  try {
    const { sscc, quantity, farmPlotNumber, productId, producerId, startDate, endDate } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!sscc || !quantity || !farmPlotNumber || !productId || !producerId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    

    // Kiểm tra độ dài SSCC
    if (sscc.length !== 18) {
      return res.status(400).json({ error: 'SSCC phải có 18 ký tự' });    }

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
      return res.status(400).json({ error: 'Start date không hợp lệ' });
    }
    if (isNaN(cleanEndDate) || cleanEndDate <= 0) {
      return res.status(400).json({ error: 'End date không hợp lệ' });
    }
    if (cleanStartDate >= cleanEndDate) {
      return res.status(400).json({ error: 'End date không hợp lệ' });
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

    const ssccExists = await contract.methods.ssccExists(sscc).call();
    if (ssccExists) {
      return res.status(400).json({ error: 'SSCC đã tồn tại, vui lòng nhập lại SSCC khác' });
    }

    let productImageUrl = '';

    // Debugging: Log các tệp nhận được

    // Xử lý productImage
    if (req.files && req.files['productImage'] && req.files['productImage'][0]) {
      const productImageFile = req.files['productImage'][0];
      const productImageResult = await uploadFile(productImageFile.buffer, productImageFile.originalname);
      productImageUrl = productImageResult.ipfsUrl;
    } else {
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
    // Gọi hàm createBatch của smart contract
    const result = await contract.methods.createBatch(
      sscc,
      cleanProducerId,
      quantity,
      productImageUrl,
      certificateImageUrl,
      farmPlotNumber,
      cleanProductId,
      cleanStartDate,
      cleanEndDate
    ).send({ from: account.address, gas: 3000000 });

    // Chuyển đổi kết quả thành chuỗi JSON
    const safeResult = JSON.parse(JSON.stringify(result, replacer));

    res.status(200).send({ 
      message: 'Lô hàng đã được tạo thành công và đang chờ phê duyệt', 
      transactionHash: safeResult.transactionHash,
      batchId: safeResult.events.BatchCreated.returnValues.batchId,
      productImageUrl,
      certificateImageUrl

    });
  } catch (err) {
    console.error('Error creating batch:', err);
    res.status(500).json({ error: 'Lỗi khi tạo lô hàng: ' + err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/batches/producer/:producerId', async (req, res) => {
  try {
      const producerId = req.params.producerId;
      console.log(`Fetching batches for producer ID: ${producerId}`);
      const batches = await contract.methods.getBatchesByProducer(producerId).call();
      console.log('Fetched batches:', batches);
      const batchDetails = batches.map(batch => ({
          batchId: batch.batchId.toString(),
          sscc: batch.sscc,
          producerId: batch.producerId.toString(),
          quantity: batch.quantity,
          productionDate: new Date(Number(batch.productionDate) * 1000).toISOString(),
          expiryDate: new Date(Number(batch.expiryDate) * 1000).toISOString(),
          startDate: new Date(Number(batch.startDate) * 1000).toISOString(),
          endDate: new Date(Number(batch.endDate) * 1000).toISOString(),
          status: ['Created', 'PendingApproval', 'Approved', 'Rejected'][Number(batch.status)],
          productImageUrl: batch.productImageUrl,
          certificateImageUrl: batch.certificateImageUrl,
          farmPlotNumber: batch.farmPlotNumber,
          dataHash: batch.dataHash,
          productId: batch.productId.toString()
      }));
      res.json(batchDetails);
  } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ error: error.message });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


