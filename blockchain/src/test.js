const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const express = require('express');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const mysql = require('mysql');
dotenv.config();
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer(); // Lưu trữ tệp trong bộ nhớ đệm

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình AWS SDK
// Khởi tạo đối tượng S3
const s3Client = new S3Client({
  endpoint: 'https://s3.filebase.com',
  region: process.env.FILEBASE_REGION, // Đọc giá trị region từ tệp .env
  credentials: {
    accessKeyId: 'FB77055A97DE296E0668', // Đọc giá trị access key từ tệp .env
    secretAccessKey: 'TQQGAV3TtNLEJqEafjz5pf1rpaSwA0tpzupn9yYu', // Đọc giá trị secret key từ tệp .env
  },
});


const db = mysql.createConnection({
  host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
  user: 'admin',
  port: '3306',
  password: '9W8RQuAdnZylXZAmb68P',
  database: 'blockchain',
  connectTimeout: 10000 // Tăng thời gian chờ kết nối lên 10 giây
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
    return;
  }
  console.log('Đã kết nối cơ sở dữ liệu');
});






// Cấu hình AWS SDK 
async function uploadFile(fileBuffer, fileName) {
  try {
    console.log(`Bắt đầu tải lên Filebase: ${fileName}`);
    const command = new PutObjectCommand({
      Bucket: "nckh", // Đọc giá trị bucket từ tệp .env
      Key: fileName,
      Body: fileBuffer,
      ContentType: 'image/jpg', // Hoặc loại MIME phù hợp với ảnh của bạn
    });
    console.log(`Bucket: ${command.input.Bucket}`); // Log giá trị của Bucket để kiểm tra
    await s3Client.send(command);
    console.log(`Tải lên thành công: ${fileName}`);
    
    // Giả sử CID được lấy từ fileName hoặc từ response của Filebase
    const cid = fileName.split('.')[0]; // Thay thế bằng cách lấy CID thực tế từ Filebase
    const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
    return ipfsUrl;
  } catch (error) {
    console.error('Lỗi khi tải lên Filebase:', error.message);
    throw error;
  }
}

// Endpoint để kiểm tra hàm upload
app.post('/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('Không có tệp nào được tải lên');
  }

  try {
    console.log(`Đang tải lên tệp: ${file.originalname}`);
    const ipfsUrl = await uploadFile(file.buffer, file.originalname);
    console.log(`Tệp đã được tải lên thành công: ${ipfsUrl}`);
    res.send({ message: 'Tệp đã được tải lên thành công', url: ipfsUrl });
  } catch (error) {
    console.error('Lỗi khi tải lên tệp:', error);
    res.status(500).send('Lỗi khi tải lên tệp');
  }
});

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

const contractABI =  [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "batchId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "batchName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "producerId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "productionDate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expireDate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "approver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "productionAddress",
        "type": "string"
      }
    ],
    "name": "BatchCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "batchId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum SupplyChain.BatchStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "BatchStatusUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "batches",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "batchId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "batchName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "producerId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "productionDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expireDate",
        "type": "uint256"
      },
      {
        "internalType": "enum SupplyChain.BatchStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "sscc",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "productionAddress",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "nextBatchId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_batchName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_productId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_producerId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_productionDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_expireDate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_approver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_productionAddress",
        "type": "string"
      }
    ],
    "name": "createBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_batchId",
        "type": "uint256"
      },
      {
        "internalType": "enum SupplyChain.BatchStatus",
        "name": "_status",
        "type": "uint8"
      }
    ],
    "name": "updateBatchStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractAddress = '0xcd56402fBa9e48A00e2f186032C5F2BA015844e0';
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

app.post('/createbatch', async (req, res) => {
  console.log('Original request body:', req.body); // Log dữ liệu gốc từ request body

  const cleanedBody = cleanKeys(req.body);
  const { batchName, productId, producerId, quantity, productionDate, expireDate, productionAddress } = cleanedBody;

  console.log('Cleaned request body:', cleanedBody); // Log dữ liệu đã được làm sạch

  try {
    // Kiểm tra nếu request body trống
    if (Object.keys(cleanedBody).length === 0) {
      return res.status(400).send('Request body trống');
    }

    // Kiểm tra các trường bắt buộc
    if (!batchName) return res.status(400).send('Thiếu tên lô hàng');
    if (!productId) return res.status(400).send('Thiếu mã sản phẩm');
    if (!producerId) return res.status(400).send('Thiếu mã nhà sản xuất');
    if (!quantity) return res.status(400).send('Thiếu số lượng');
    if (!productionDate) return res.status(400).send('Thiếu ngày sản xuất');
    if (!expireDate) return res.status(400).send('Thiếu ngày hết hạn');
    if (!productionAddress) return res.status(400).send('Thiếu địa chỉ sản xuất');

    // Làm sạch dữ liệu đầu vào
    const cleanProductId = productId ? productId.trim() : '';
    const cleanProducerId = producerId ? producerId.trim() : '';
    const cleanQuantity = quantity ? parseInt(quantity, 10) : 0;
    const cleanProductionDate = productionDate ? new Date(productionDate).getTime() / 1000 : 0; // Chuyển đổi ngày thành Unix timestamp
    const cleanExpireDate = expireDate ? new Date(expireDate).getTime() / 1000 : 0; // Chuyển đổi ngày thành Unix timestamp
    const cleanProductionAddress = productionAddress ? productionAddress.trim() : '';

    // Ensure all required conditions are met
    if (!batchName || !cleanProductId || !cleanProducerId || !cleanQuantity || !cleanProductionDate || !cleanExpireDate || !cleanProductionAddress) {
      return res.status(400).send('Invalid input parameters');
    }

    console.log('Input productId:', cleanProductId);
    console.log('Input producerId:', cleanProducerId);

    try {
      // Kiểm tra sự tồn tại của sản phẩm
      const productResults = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM products WHERE product_id = ?', [cleanProductId], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });
      console.log('Product query result:', productResults); // Log kết quả truy vấn sản phẩm

      if (!Array.isArray(productResults) || productResults.length === 0) {
        return res.status(400).send('Sản phẩm không tồn tại');
      }

      const productIdFromDb = productResults[0].product_id;
      console.log('Database productId:', productIdFromDb);

      // Kiểm tra sự tồn tại của người dùng
      const userResults = await new Promise((resolve, reject) => {
        db.query('SELECT uid FROM users WHERE uid = ?', [cleanProducerId], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });
      console.log('User query result:', userResults); // Log kết quả truy vấn người dùng

      if (!Array.isArray(userResults) || userResults.length === 0) {
        return res.status(400).send('Người dùng không tồn tại');
      }

      const userIdFromDb = userResults[0].uid;
      console.log('Database userId:', userIdFromDb);

      // Chuyển đổi các giá trị thành kiểu dữ liệu phù hợp
      const productionDateTimestamp = BigInt(cleanProductionDate);
      const expireDateTimestamp = BigInt(cleanExpireDate);
      
      // Lấy danh sách tài khoản từ web3
      const accounts = await web3.eth.getAccounts();
      console.log('Accounts:', accounts);

      // Ước tính gas
      const gasEstimate = await contract.methods.createBatch(
        batchName,
        cleanProductId,
        cleanProducerId,
        cleanQuantity,
        productionDateTimestamp.toString(), // Chuyển đổi BigInt thành chuỗi
        expireDateTimestamp.toString(), // Chuyển đổi BigInt thành chuỗi
        accounts[0],
        cleanProductionAddress
      ).estimateGas({ from: accounts[0] });

      // Chuyển đổi gasEstimate thành BigInt trước khi cộng
      const gasEstimateBigInt = BigInt(gasEstimate);
      const additionalGas = BigInt(100000);

      // Gửi giao dịch
      await contract.methods.createBatch(
        batchName,
        cleanProductId,
        cleanProducerId,
        cleanQuantity,
        productionDateTimestamp.toString(), // Chuyển đổi BigInt thành chuỗi
        expireDateTimestamp.toString(), // Chuyển đổi BigInt thành chuỗi
        accounts[0],
        cleanProductionAddress
      ).send({
        from: accounts[0],
        gas: gasEstimateBigInt + additionalGas // Cộng hai giá trị BigInt
      });

      res.send('Lô hàng đã được tạo thành công, được lưu trữ trong blockchain');
    } catch (error) {
      console.error('Database query error:', error);
      return res.status(500).send('Lỗi truy vấn cơ sở dữ liệu');
    }

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Lỗi tạo lô hàng');
  }
});

console.log('Access Key:', process.env.FILEBASE_ACCESS_KEY);
console.log('Secret Key:', process.env.FILEBASE_SECRET_KEY);
console.log('Bucket Name:', process.env.FILEBASE_BUCKET_NAME);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});