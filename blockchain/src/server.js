const express = require('express');
const bodyParser = require('body-parser');
const {Web3} = require('web3')
const mysql = require('mysql');


const app = express();
app.use(bodyParser.json());

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const contractABI = [
    [
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
      ]
];
const contractAddress = '0x968aDA255B3fC953f8E6C6ca292a21b8d8603442'; 
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

app.post('/createBatch', async (req, res) => {
  const { batchName, productId, producerId } = req.body;

  try   {
    // Kiểm tra sản phẩm trong cơ sở dữ liệu
    db.query('SELECT * FROM products WHERE product_id = ?', [productId], (err, productResults) => {
        if (err) {
            console.error('Error querying product:', err);
            return res.status(500).send('Error querying product');
        }
        if (productResults.length === 0) {
            return res.status(400).send('Invalid product ID');
        }

        console.log('Product found:', JSON.stringify(productResults[0], null, 2));

        // Kiểm tra người dùng trong cơ sở dữ liệu
        db.query('SELECT * FROM users WHERE uid = ?', [producerId], async (err, userResults) => {
            if (err) {
                console.error('Error querying user:', err);
                return res.status(500).send('Error querying user');
            }
            if (userResults.length === 0) {
                return res.status(400).send('Invalid producer ID');
            }

            console.log('User found:', JSON.stringify(userResults[0], null, 2));

            try {
                const accounts = await web3.eth.getAccounts();
                console.log('Accounts:', accounts);

                const receipt = await contract.methods.createBatch(batchName, productId, producerId).send({ from: accounts[0] });
                console.log('Transaction receipt:', JSON.stringify(receipt, null, 2));

                res.send('Batch created successfully');
            } catch (err) {
                console.error('Error creating batch:', err);
                res.status(500).send('Error creating batch');
            }
        });
    });
  }  catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error creating batch');
  }
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});