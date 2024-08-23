const express = require('express');
const bodyParser = require('body-parser');
const {Web3} = require('web3'); // Sửa lại cách import Web3
const mysql = require('mysql');

const app = express();
app.use(bodyParser.json());

const web3 = new Web3('http://localhost:8545'); // Khởi tạo đối tượng Web3 với URL của node Ethereum của bạn

const contractABI =    [
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

const contractAddress = '0x835a77913B27F0a8a38ADab33E1Df25A3eB445FA'; 
const contract = new web3.eth.Contract(contractABI, contractAddress);

async function getBatch(batchId) {
    try {
        const batch = await contract.methods.getBatch(batchId).call();
        console.log('Batch:', batch);
        return batch;
    } catch (err) {
        console.error('Error retrieving batch:', err.message);
        throw err;
    }
}

const batchId = 1; // Thay thế bằng batchId thực tế
getBatch(batchId).then(batch => {
    console.log('Lô hàng đã truy xuất:', batch);
}).catch(err => {
    console.error('Lỗi truy xuất lô hàng:', err.message);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});