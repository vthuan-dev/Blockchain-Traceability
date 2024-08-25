import express from 'express';
import bodyParser from 'body-parser';
import Web3 from 'web3';
import mysql from 'mysql';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dangkyRoutes from './components/user/dangky.js';
import dangnhapRoutes from './components/user/dangnhap.js';
import { create as createIPFS } from 'ipfs-http-client';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// kết nối với IPFS Infura


const projectId = '70a7bf700e4d43d99416d55c6b557d3b';
const projectSecret = '31HZcE5yLu+fbl7iIiFjCeg2GwKgk424JDamF+zdQrNFTNsfA+eDHQ';

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = createIPFS({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth
  }
});
const upload = multer({ dest: 'uploads/' });

async function uploadFileToIPFS(filePath) {
  try {
      const file = fs.readFileSync(filePath);
      const result = await ipfs.add(file);
      console.log(result);
  } catch (error) {
      console.error('Lỗi khi tải lên IPFS:', error);
  }
}

// Các phần còn lại của mã...


const app = express();
app.use(bodyParser.json());


const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.infura.io/v3/70a7bf700e4d43d99416d55c6b557d3b' + projectId));
const contractABI =  [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_admin",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
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
        "internalType": "string",
        "name": "sscc",
        "type": "string"
      }
    ],
    "name": "BatchApproved",
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
        "name": "certificateImageHash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "approverId",
        "type": "uint256"
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
      }
    ],
    "name": "BatchRejected",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
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
        "name": "certificateImageHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "approverId",
        "type": "uint256"
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
        "internalType": "string[]",
        "name": "_imageHashes",
        "type": "string[]"
      },
      {
        "internalType": "string",
        "name": "_certificateImageHash",
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
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_batchId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_sscc",
        "type": "string"
      }
    ],
    "name": "approveBatch",
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
      }
    ],
    "name": "rejectBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPendingBatches",
    "outputs": [
      {
        "components": [
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
            "internalType": "string[]",
            "name": "imageHashes",
            "type": "string[]"
          },
          {
            "internalType": "string",
            "name": "certificateImageHash",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "approverId",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChain.Batch[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  }
];


const contractAddress = '0x96c708F7ba2773Cf315E7e4898c2b11eb61D610D'; 
const contract = new web3.eth.Contract(contractABI, contractAddress);

const db = mysql.createConnection({
  host: 'database-1.cv20qo0q8bre.ap-southeast-2.rds.amazonaws.com',
  user: 'admin',
  password: '9W8RQuAdnZylXZAmb68P',
  database: 'blockchain'
});
db.connect((err) => {
  if (err) {
      console.error('Error connecting to the database:', err);
      return;
  }
  console.log('Connected to the database');
});

app.use('/api', dangkyRoutes);

// Sử dụng router đăng nhập
app.use('/api', dangnhapRoutes);


// Hàm tạo mã lô hàng duy nhất
function generateBatchCode() {
  return 'BATCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

contract.events.BatchCreated({
  fromBlock: 0
}, function (error, event) {
  if (error) {
      console.error('Error listening to event:', error);
  } else {
      console.log('BatchCreated event:', event);
  }
});

async function getBatch(batchId) {
  try {
    const batch = await contract.methods.getBatch(batchId).call();
    // Chuyển đổi các giá trị BigInt thành chuỗi bằng JSON.stringify với hàm thay thế
    const batchStringified = JSON.stringify(batch, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    return JSON.parse(batchStringified);
  } catch (error) {
    console.error('Error fetching batch data:', error);
    return null;
  }
}

app.get('/api/batch/:batchId', async (req, res) => {
  const batchId = req.params.batchId;
  const batch = await getBatch(batchId);
  if (batch) {
    res.json(batch);
  } else {
    res.status(404).send('Batch not found');
  }
});

app.post('/createbatch', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'certificate', maxCount: 1 }]), async (req, res) => {
  const { batchName, productId, producerId, quantity, productionDate, expireDate } = req.body;
  const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
  const certificateFile = req.files && req.files['certificate'] ? req.files['certificate'][0] : null;
  const imageHashes = [];
  let certificateImageHash = '';

  try {
    if (!ipfs.isOnline()) {
      return res.status(500).send('IPFS is not connected');
    }

    // Tải lên các hình ảnh liên quan đến lô hàng lên IPFS
    for (const file of imageFiles) {
      const filePath = path.join(__dirname, file.path);
      try {
        const ipfsHash = await uploadFileToIPFS(filePath);
        imageHashes.push(ipfsHash);
      } catch (err) {
        console.error('Error uploading image to IPFS:', err);
        return res.status(500).send('Error uploading image to IPFS');
      } finally {
        fs.unlinkSync(filePath); // Xóa tệp tạm sau khi tải lên
      }
    }

    // Tải lên giấy chứng nhận lên IPFS
    if (certificateFile) {
      const filePath = path.join(__dirname, certificateFile.path);
      try {
        certificateImageHash = await uploadFileToIPFS(filePath);
      } catch (err) {
        console.error('Error uploading certificate to IPFS:', err);
        return res.status(500).send('Error uploading certificate to IPFS');
      } finally {
        fs.unlinkSync(filePath); // Xóa tệp tạm sau khi tải lên
      }
    }

    // Kiểm tra sản phẩm trong cơ sở dữ liệu
    const productResults = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM products WHERE product_id = ?', [productId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (productResults.length === 0) {
      return res.status(400).send('ID sản phẩm không hợp lệ');
    }

    console.log('Product found:', JSON.stringify(productResults[0], null, 2));

    // Kiểm tra người dùng trong cơ sở dữ liệu
    const userResults = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM users WHERE uid = ?', [producerId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (userResults.length === 0) {
      return res.status(400).send('ID người dùng không hợp lệ');
    }

    console.log('User found:', JSON.stringify(userResults[0], null, 2));

    try {
      const accounts = await web3.eth.getAccounts();
      console.log('Accounts:', accounts);

      // chuyển đổi giá trị gasEstimate từ number sang BigInt
      const gasEstimate = BigInt(await contract.methods.createBatch(
        batchName,
        productId,
        producerId,
        quantity,
        productionDate,
        expireDate,
        imageHashes, // Thêm hash của các hình ảnh vào blockchain
        certificateImageHash // Thêm hash của giấy chứng nhận vào blockchain
      ).estimateGas({ from: accounts[0] }));

      // Gửi giao dịch tạo lô hàng 
      const receipt = await contract.methods.createBatch(
        batchName,
        productId,
        producerId,
        quantity,
        productionDate,
        expireDate,
        imageHashes, // Thêm hash của các hình ảnh vào blockchain
        certificateImageHash // Thêm hash của giấy chứng nhận vào blockchain
      ).send({
        from: accounts[0],
        gas: gasEstimate + BigInt(100000) // Thêm gas bổ sung
      });

      // Chuyển đổi giá trị BigInt trong receipt sang chuỗi
      const receiptStringified = JSON.stringify(receipt, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );

      console.log('Transaction receipt:', receiptStringified);
      res.send('Lô hàng đã được tạo thành công, được lưu trữ trong blockchain');
    } catch (err) {
      console.error('Error creating batch:', err);
      res.status(500).send('Lỗi tạo lô hàng 1');
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Lỗi tạo lô hàng');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

export default app;
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});