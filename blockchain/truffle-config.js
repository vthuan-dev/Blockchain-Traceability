const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const privateKey = process.env.PRIVATE_KEY;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      db_path: "./ganache-db"
    },
    sepolia: {
      provider: () => new HDWalletProvider(privateKey, `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
      network_id: 11155111,
      gas: 15000000,  // Tăng từ 8000000 lên 15000000
      gasPrice: 10000000000, // 10 Gwei
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 10000
    },
  },

  mocha: {
    // timeout: 100000
  },

  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }
};
