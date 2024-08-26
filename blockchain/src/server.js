const express = require('express');
const bodyParser = require('body-parser');
const { Web3 } = require('web3');
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const dangkyRoutes = require('./components/user/dangky.js');

//const dangnhapRoutes = require('./components/user/dangnhap.js');

const app = express();
app.use(bodyParser.json());

app.use('/api', dangkyRoutes); // Now dangkyRoutes is defined
//app.use('/api', dangnhapRoutes); // Now dangkyRoutes is defined


const infuraEndpoint = 'https://mainnet.infura.io/v3/70a7bf700e4d43d99416d55c6b557d3b';
console.log(`Đã kết nối với endpoint của Infura: ${infuraEndpoint}`);

const contractABI = [
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
        "name": "certificateHash",
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
const contractAddress = '0xf5C32D998A1c53e32ac883b9b91019b714936329'; // Replace with your contract address

const web3 = new Web3(new Web3.providers.HttpProvider(infuraEndpoint));


async function checkInfuraConnection() {
  try {
    //dấu hiệu kết nối thành công là khi không có lỗi và không bị timeout
    await web3.eth.net.isListening();
    console.log('Đã kết nối với Infura endpoint');
  } catch (error) {
    console.error('Thất bại khi kết nối với Infura:', error);
    process.exit(1); // Exit the process with an error code
  }
}

// Khởi tạo hợp đồng với ABI và địa chỉ hợp đồng
const contract = new web3.eth.Contract(contractABI, contractAddress);

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




const upload = multer(); // Lưu trữ tệp trong bộ nhớ đệm


const INFURA_PROJECT_ID = '31HZcE5yLu+fbl7iIiFjCeg2GwKgk424JDamF+zdQrNFTNsfA+eDHQ';

async function uploadToIPFS(fileBuffer, fileName) {
  const url = `https://ipfs.infura.io:5001/api/v0/add?project_id=${INFURA_PROJECT_ID}`;
  const formData = new FormData();
  formData.append('file', fileBuffer, fileName);

  try {
    console.log(`Bắt đầu tải lên IPFS: ${fileName}`);
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    console.log(`Tải lên thành công: ${response.data.Hash}`);
    return response.data.Hash;
  } catch (error) {
    console.error('Lỗi khi tải lên IPFS:', error.response ? error.response.data : error.message);
    throw error;
  }
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
  let certificateHash = '';

  try {
    // Tải lên các tệp ảnh lên IPFS và lấy hash
    for (const file of imageFiles) {
      const hash = await uploadToIPFS(file.buffer, file.originalname);
      imageHashes.push(hash);
    }

    // Tải lên giấy chứng nhận lên IPFS và lấy hash
    if (certificateFile) {
      certificateHash = await uploadToIPFS(certificateFile.buffer, certificateFile.originalname);
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
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Lỗi tạo lô hàng');
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const ipfsHash = await uploadToIPFS(fileBuffer, fileName);
    res.json({ ipfsHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, async () => {
  await checkInfuraConnection(); // Check Infura connection when the server starts
  console.log('Server is running on port 3000');
});