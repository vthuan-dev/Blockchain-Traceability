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



// Cấu hình AWS SDK
// Khởi tạo đối tượng S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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

db.query('SELECT * FROM users', (err, results) => {
  if (err) {
    console.error('Error querying the users table:', err);
    return;
  }
  console.log('Users:', results);
});

db.query('SELECT * FROM products', (err, results) => {
  if (err) {
    console.error('Error querying the products table:', err);
    return;
  }
  console.log('Products:', results);
});



// Cấu hình AWS SDK với thông tin từ Filebase


async function uploadFile(fileBuffer, fileName) {
  try {
    console.log(`Bắt đầu tải lên Filebase: ${fileName}`);
    const command = new PutObjectCommand({
      Bucket: "truyxuat", // Đọc giá trị bucket từ tệp .env
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

const contractAddress = '0xf5C32D998A1c53e32ac883b9b91019b714936329';
const contract = new web3.eth.Contract(contractABI, contractAddress);

app.post('/createbatch', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'certificate', maxCount: 1 }]), async (req, res) => {
  const { batchName, productId, producerId, quantity, productionDate, expireDate } = req.body;
  const imageFiles = Array.isArray(req.files && req.files['images']) ? req.files['images'] : [];
  const certificateFile = req.files && req.files['certificate'] ? req.files['certificate'][0] : null;
  const imageHashes = [];
  let certificateHash = '';

  try {
    // Truy vấn toàn bộ dữ liệu từ bảng users
    db.query('SELECT * FROM users', (err, userResults) => {
      if (err) {
        console.error('Error querying the users table:', err);
        return res.status(500).send('Lỗi truy vấn bảng users');
      }
      console.log('Users:', userResults);

      // Kiểm tra kết quả truy vấn bảng users
      if (!Array.isArray(userResults) || userResults.length === 0) {
        return res.status(400).send('Không có người dùng nào tồn tại');
      }

      // Truy vấn toàn bộ dữ liệu từ bảng products
      db.query('SELECT * FROM products', async (err, productResults) => {
        if (err) {
          console.error('Error querying the products table:', err);
          return res.status(500).send('Lỗi truy vấn bảng products');
        }
        console.log('Products:', productResults);

        // Kiểm tra kết quả truy vấn bảng products
        if (!Array.isArray(productResults) || productResults.length === 0) {
          return res.status(400).send('Không có sản phẩm nào tồn tại');
        }

        // Tải lên các tệp ảnh lên Filebase và lấy URL
        for (const file of imageFiles) {
          const params = {
            Bucket: 'nckh',
            Key: file.originalname,
            Body: file.buffer,
            ContentType: file.mimetype,
          };
          const command = new PutObjectCommand(params);
          await s3Client.send(command);
          const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          imageHashes.push(url);
        }

        // Tải lên giấy chứng nhận lên Filebase và lấy URL
        if (certificateFile) {
          const params = {
            Bucket: 'nckh',
            Key: certificateFile.originalname,
            Body: certificateFile.buffer,
            ContentType: certificateFile.mimetype,
          };
          const command = new PutObjectCommand(params);
          await s3Client.send(command);
          certificateHash = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        }

        // Chuyển đổi ngày thành Unix timestamp
        const productionDateTimestamp = Math.floor(new Date(productionDate).getTime() / 1000);
        const expireDateTimestamp = Math.floor(new Date(expireDate).getTime() / 1000);

        // Kiểm tra các trường bắt buộc
        if (!batchName || !productId || !producerId || !quantity || !productionDateTimestamp || !expireDateTimestamp || imageHashes.length === 0 || !certificateHash) {
          return res.status(400).send('Thiếu thông tin bắt buộc');
        }

        // Gửi giao dịch tạo lô hàng lên blockchain
        const accounts = await web3.eth.getAccounts();
        const gasEstimate = await contract.methods.createBatch(
          batchName,
          productId,
          producerId,
          quantity,
          productionDateTimestamp,
          expireDateTimestamp,
          imageHashes,
          certificateHash
        ).estimateGas({ from: accounts[0] });

        await contract.methods.createBatch(
          batchName,
          productId,
          producerId,
          quantity,
          productionDateTimestamp,
          expireDateTimestamp,
          imageHashes,
          certificateHash
        ).send({
          from: accounts[0],
          gas: gasEstimate + 100000
        });

        res.send('Lô hàng đã được tạo thành công, được lưu trữ trong blockchain');
      });
    });
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