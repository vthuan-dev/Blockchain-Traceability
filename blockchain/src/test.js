const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const express = require('express');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const mysql = require('mysql');
dotenv.config();

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
  database: 'blockchain'
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
    return;
  }
  console.log('Đã kết nối cơ sở dữ liệu');
});






// Cấu hình AWS SDK với thông tin từ Filebase


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
    const fileUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`Tải lên thành công: ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    console.error('Lỗi khi tải lên Filebase:', error.message);
    throw error;
  }
}

// Endpoint để kiểm tra hàm upload
/*
app.post('/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('Không có tệp nào được tải lên');
  }

  try {
    console.log(`Đang tải lên tệp: ${file.originalname}`);
    const fileUrl = await uploadFile(file.buffer, file.originalname);
    console.log(`Tệp đã được tải lên thành công: ${fileUrl}`);
    res.send(`Tệp đã được tải lên thành công: ${fileUrl}`);
  } catch (error) {
    console.error('Lỗi khi tải lên tệp:', error);
    res.status(500).send('Lỗi khi tải lên tệp');
  }
});
*/


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

const contractABI = [
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
    "internalType": "string[]",
    "name": "imageHashes",
    "type": "string[]"
  },
  {
    "indexed": false,
    "internalType": "string",
    "name": "certificateHash",
    "type": "string"
  },
  {
    "indexed": false,
    "internalType": "uint256",
    "name": "approverId",
    "type": "uint256"
  },
  {
    "name": "BatchCreated",
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
        "internalType": "string",
        "name": "certificateHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "approverId",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
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
    "type": "function"
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
        "internalType": "string[]",
        "name": "_imageHashes",
        "type": "string[]"
      },
      {
        "internalType": "string",
        "name": "_certificateHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_approverId",
        "type": "uint256"
      }
    ],
    "name": "createBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractAddress = '0x8F9f4b12c30b331b64C6c78fE523c919698D21ef';
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



app.post('/createbatch', upload.fields([{ name: 'images', maxCount: 10 }]), async (req, res) => {
  const cleanedBody = cleanKeys(req.body);
  const { batchName, productId, producerId, quantity, productionDate, expireDate, productionAddress } = cleanedBody;
  const files = req.files;

  console.log('Request body:', cleanedBody); // In ra toàn bộ cleanedBody để kiểm tra
  console.log('Request files:', req.files); // In ra toàn bộ req.files để kiểm tra

  try {
    // Kiểm tra các trường bắt buộc
    if (!batchName) return res.status(400).send('Thiếu tên lô hàng');
    if (!productId) return res.status(400).send('Thiếu mã sản phẩm');
    if (!producerId) return res.status(400).send('Thiếu mã nhà sản xuất');
    if (!quantity) return res.status(400).send('Thiếu số lượng');
    if (!productionDate) return res.status(400).send('Thiếu ngày sản xuất');
    if (!expireDate) return res.status(400).send('Thiếu ngày hết hạn');
    if (!productionAddress) return res.status(400).send('Thiếu địa chỉ sản xuất');
    if (!files || !files.images || files.images.length === 0) return res.status(400).send('Thiếu ảnh');

    // Làm sạch dữ liệu đầu vào
    const cleanProductId = productId.trim();
    const cleanProducerId = producerId.trim();
    const cleanQuantity = parseInt(quantity, 10);
    const cleanProductionDate = parseInt(productionDate, 10);
    const cleanExpireDate = parseInt(expireDate, 10);
    const cleanProductionAddress = productionAddress.trim();

    console.log('Input productId:', cleanProductId);
    console.log('Input producerId:', cleanProducerId);

    // Kiểm tra sự tồn tại của sản phẩm
    const [productResults] = await db.query('SELECT product_id FROM products WHERE product_id = ?', [cleanProductId]);
    console.log('Product query result:', productResults); // Log kết quả truy vấn sản phẩm
    if (!productResults || productResults.length === 0) {
      return res.status(400).send('Sản phẩm không tồn tại');
    }
    const productIdFromDb = productResults[0].product_id;
    console.log('Database productId:', productIdFromDb);

    // Kiểm tra sự tồn tại của người dùng
    const [userResults] = await db.query('SELECT uid FROM users WHERE uid = ?', [cleanProducerId]);
    console.log('User query result:', userResults); // Log kết quả truy vấn người dùng
    if (!userResults || userResults.length === 0) {
      return res.status(400).send('Người dùng không tồn tại');
    }
    const userIdFromDb = userResults[0].uid;
    console.log('Database userId:', userIdFromDb);

    // Xử lý các tệp ảnh
    const processedFiles = await processFiles(files);
    const imageUrls = processedFiles['images'] || [];

    // Chuyển đổi ngày thành Unix timestamp
    const productionDateTimestamp = Math.floor(new Date(cleanProductionDate).getTime() / 1000);
    const expireDateTimestamp = Math.floor(new Date(cleanExpireDate).getTime() / 1000);

    // Gửi giao dịch tạo lô hàng lên blockchain
    const accounts = await web3.eth.getAccounts();
    const gasEstimate = await contract.methods.createBatch(
      batchName,
      cleanProductId,
      cleanProducerId,
      cleanQuantity,
      productionDateTimestamp,
      expireDateTimestamp,
      imageUrls,
      accounts[0], // Sử dụng địa chỉ của người gọi hàm làm người kiểm duyệt
      cleanProductionAddress
    ).estimateGas({ from: accounts[0] });

    await contract.methods.createBatch(
      batchName,
      cleanProductId,
      cleanProducerId,
      cleanQuantity,
      productionDateTimestamp,
      expireDateTimestamp,
      imageUrls,
      accounts[0], // Sử dụng địa chỉ của người gọi hàm làm người kiểm duyệt
      cleanProductionAddress
    ).send({
      from: accounts[0],
      gas: gasEstimate + 100000
    });

    res.send('Lô hàng đã được tạo thành công, được lưu trữ trong blockchain');
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