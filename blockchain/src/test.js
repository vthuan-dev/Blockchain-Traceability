const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require('multer');
const express = require('express');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const mysql = require('mysql');
dotenv.config();
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // giới hạn kích thước file 5MB
  }
}).fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'certificateImage', maxCount: 1 }
]);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình S3 client
const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: "us-east-1", // Thay đổi region nếu cần
  credentials: {
    accessKeyId: "FB77055A97DE296E0668",
    secretAccessKey: "TQQGAV3TtNLEJqEafjz5pf1rpaSwA0tpzupn9yYu"
  }
});


const db = mysql.createConnection({
  host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
  user: 'admin',
  port: '3306',
  password: '9W8RQuAdnZylXZAmb68P',
  database: 'blockchain',
  connectTimeout: 10000 // Tăng thời gian chờ kết nối lên 10 giây =)
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
    return;
  }
  console.log('Đã kết nối cơ sở dữ liệu');
});
const { CID } = require('multiformats/cid');
const { sha256 } = require('multiformats/hashes/sha2');
const { base58btc } = require('multiformats/bases/base58');

const BUCKET_NAME = 'nckh';
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

// Hàm kiểm tra trạng thái file và lấy CID
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
function validateAndFormatAddress(address) {
  if (!address) {
    throw new Error('Địa chỉ không được để trống');
  }
  
  if (!web3.utils.isAddress(address)) {
    throw new Error('Địa chỉ không hợp lệ');
  }
  
  return web3.utils.toChecksumAddress(address);
}

async function processFiles(files) {
  const processedFiles = {};

  // Kiểm tra sự tồn tại của tệp ảnh lô hàng
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
// Cấu hình Web3 với node Ethereum cục bộ
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); // Địa chỉ node Ethereum cục bộ

const account = web3.eth.accounts.privateKeyToAccount('0xe9437cabf0c3b29aac95c0338c1177a53f6a2487e15480d959f37cb1597b5795');
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address

web3.eth.net.isListening()
  .then(() => console.log('Đã kết nối với ETH node'))
  .catch(e => console.log('Lỗi rồi', e));

const contractABI = require('../build/contracts/TraceabilityContract.json').abi;

const contractAddress = '0x99e83fb3b2b0cA606A4587CcBE7590Da2e2E7228';
const contract = new web3.eth.Contract(contractABI, contractAddress);

// Cấu hình middleware để phân tích dữ liệu JSON và URL-encoded


function cleanKeys(obj) {
  const cleanedObj = {};
  for (const key in obj) {
    const cleanKey = key.trim();
    cleanedObj[cleanKey] = obj[key];
  }
  return cleanedObj;
}

app.use(express.urlencoded({ extended: true })); // Sử dụng để phân tích dữ liệu URL-encoded

// Thêm hàm này vào đầu file, sau phần import và cấu hình
async function getEthereumAddressFromId(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT ethereum_address FROM users WHERE id = ?', [id], (error, results) => {
      if (error) {
        console.error('Database query error:', error);
        reject(error);
      } else if (results.length > 0 && results[0].ethereum_address) {
        console.log(`Địa chỉ Ethereum cho ID ${id}:`, results[0].ethereum_address);
        resolve(results[0].ethereum_address);
      } else {
        console.log(`Không tìm thấy địa chỉ Ethereum cho ID ${id}`);
        reject(new Error(`Không tìm thấy địa chỉ Ethereum cho ID ${id}`));
      }
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

async function checkUserExists(userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE uid = ?', [userId], (error, results) => {
      if (error) return reject(error);
      resolve(results.length > 0);
    });
  });
}

// Route handler cho việc tạo lô hàng
app.post('/createbatch', upload, async (req, res) => {
  console.log('Received body:', req.body);
  console.log('Received files:', req.files);

  const { sscc, quantity, farmPlotNumber, productId } = req.body;

  try {
    // Kiểm tra các trường bắt buộc
    if (!sscc || !quantity || !farmPlotNumber || !productId) {
      return res.status(400).send('Thiếu thông tin bắt buộc');
    }

    // Kiểm tra độ dài SSCC
    if (sscc.length !== 18) {
      return res.status(400).send('SSCC phải có 18 ký tự');
    }

    // Kiểm tra và chuyển đổi productId
    const cleanProductId = parseInt(productId, 10);
    if (isNaN(cleanProductId) || cleanProductId <= 0) {
      return res.status(400).send('Product ID không hợp lệ');
    }

    let productImageUrl = '';
    let certificateImageUrl = '';

    // Xử lý productImage
    if (req.files['productImage']) {
      const productImageFile = req.files['productImage'][0];
      const productImageResult = await uploadFile(productImageFile.buffer, productImageFile.originalname);
      productImageUrl = productImageResult.ipfsUrl;
    } else {
      return res.status(400).send('Thiếu ảnh sản phẩm');
    }

    // Xử lý certificateImage (nếu có)
    if (req.files['certificateImage']) {
      const certificateImageFile = req.files['certificateImage'][0];
      const certificateImageResult = await uploadFile(certificateImageFile.buffer, certificateImageFile.originalname);
      certificateImageUrl = certificateImageResult.ipfsUrl;
    } else {
      console.log('Không có ảnh chứng nhận được tải lên');
      certificateImageUrl = ''; // Hoặc set một giá trị mặc định
    }

    console.log('Product Image URL:', productImageUrl);
    console.log('Certificate Image URL:', certificateImageUrl);

    // Tạo lô hàng trên blockchain
    const web3 = new Web3('http://localhost:8545'); // Địa chỉ của node Ethereum
    const contractABI = require('../build/contracts/TraceabilityContract.json').abi;
    const contractAddress = '0x99e83fb3b2b0cA606A4587CcBE7590Da2e2E7228'; // Địa chỉ của smart contract
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    const accounts = await web3.eth.getAccounts();
    const producerId = accounts[0]; // Giả sử tài khoản đầu tiên là producer

    const result = await contract.methods.createBatch(
      sscc,
      producerId,
      quantity,
      productImageUrl,
      certificateImageUrl,
      farmPlotNumber,
      cleanProductId
    ).send({ from: producerId, gas: 3000000 });

    res.status(200).send({ 
      message: 'Lô hàng đã được tạo thành công và đang chờ phê duyệt', 
      transactionHash: result.transactionHash,
      batchId: result.events.BatchCreated.returnValues.batchId,
      productImageUrl, 
      certificateImageUrl
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Lỗi khi xử lý yêu cầu: ' + err.message);
  }
});
async function updateProducerAddress(producerId, ethereumAddress) {
  return new Promise((resolve, reject) => {
    db.query('UPDATE users SET ethereum_address = ? WHERE uid = ?', [ethereumAddress, producerId], (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use((req, res, next) => {
  if (!req.user) {
    req.user = { uid: 1, role_id: 1 }; // Tạm thời gán giá trị mặc định
  }
  next();
});

app.use((req, res, next) => {
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  next();
});









































