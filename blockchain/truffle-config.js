const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const privateKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY.slice(2) : process.env.PRIVATE_KEY;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      db_path: "./ganache-db"
    },
    sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      }),
      network_id: 11155111,
      gas: 30000000, // Tăng lên tối đa
      gasPrice: 20000000000, // 20 Gwei, có thể điều chỉnh
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 1000000
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
