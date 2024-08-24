const express = require('express');
const bodyParser = require('body-parser');
const {Web3} = require('web3')
const mysql = require('mysql');
const path = require('path'); 




const app = express();
app.use(bodyParser.json());

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const contractABI =   [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "logId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "batchId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "userId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "activity",
        "type": "string"
      }
    ],
    "name": "ActivityLogged",
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
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "activityLogs",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "logId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "batchId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "userId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "activity",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "batchCount",
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
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "logCount",
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
      }
    ],
    "name": "getBatch",
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
          }
        ],
        "internalType": "struct SupplyChain.Batch",
        "name": "",
        "type": "tuple"
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
        "name": "_batchId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_producerId",
        "type": "uint256"
      }
    ],
    "name": "requestApproval",
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
      },
      {
        "internalType": "uint256",
        "name": "_userId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_activity",
        "type": "string"
      }
    ],
    "name": "logActivity",
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
    "name": "getActivityLogs",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "logId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "batchId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "activity",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChain.ActivityLog[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  }
];


const contractAddress = '0x185E159142A949cD3f7f22d712Da36F37138a9D5'; 
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




app.post('/createbatch', async (req, res) => {
  const { batchName, productId, producerId, quantity, productionDate, expireDate } = req.body;

  try {
      // Kiểm tra sản phẩm trong cơ sở dữ liệu
      db.query('SELECT * FROM products WHERE product_id = ?', [productId], (err, productResults) => {
          if (err) {
              console.error('Lỗi khi truy vấn bảng products:', err);
              return res.status(500).send('Lỗi khi truy vấn bảng products');
          }
          if (productResults.length === 0) {
              return res.status(400).send('ID sản phẩm không hợp lệ');
          }

          console.log('Product found:', JSON.stringify(productResults[0], null, 2));

          // Kiểm tra người dùng trong cơ sở dữ liệu
          db.query('SELECT * FROM users WHERE uid = ?', [producerId], async (err, userResults) => {
              if (err) {
                  console.error('Lỗi khi truy vấn bảng users:', err);
                  return res.status(500).send('Lỗi khi truy vấn bảng users');
              }
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
                    expireDate
                ).estimateGas({ from: accounts[0] }));
                // Gửi giao dịch tạo lô hàng 
                const receipt = await contract.methods.createBatch(
                    batchName,
                    productId,
                    producerId,
                    quantity,
                    productionDate,
                    expireDate
                ).send({
                    from: accounts[0],
                    gas: gasEstimate + BigInt(100000) //  additional gas to BigInt
                });
                
                // Chuyển đổi giá trị BigInt trong receipt sang chuỗi
                const receiptStringified = JSON.stringify(receipt, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                );
                
                console.log(
                    'Transaction receipt:', 
                    receiptStringified
                );             
                   res.send('Lô hàng đã được tạo thành công, được luu trữ trong blockchain');
                } catch (err) {
                    console.error('Error creating batch:', err);
                
                  if (err.code === 'ECONNREFUSED') {
                      // Lưu trữ thông tin lô hàng vào bảng batches
                      const batchCode = generateBatchCode(); // Hàm tạo mã lô hàng duy nhất
                      const productionDateStr = productionDate.toString();
                      const expireDateStr = expireDate.toString();

                      db.query('INSERT INTO batches (batch_code, product_id, quantity, production_date, expire_date) VALUES (?, ?, ?, ?, ?)', 
                      [batchCode, productId, quantity, productionDateStr, expireDateStr], (err, result) => {
                          if (err) {
                              console.error('Lỗi lưu lô hàng:', err);
                              return res.status(500).send('Lỗi lưu lô hàng');
                          }
                          res.status(500).send('Không thể kết nối với blockchain, lô hàng đã được lưu vào cơ sở dữ liệu');
                      });
                  } else {
                      res.status(500).send('Lỗi tạo lô hàng');
                  }
              }
          });
      });
  } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Lỗi tạo lô hàng');
  }
});



app.use(express.static(path.join(__dirname, 'public')));


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});