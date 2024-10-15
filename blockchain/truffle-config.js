const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Network, Alchemy } = require("alchemy-sdk");

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
        mnemonic: {
          phrase: process.env.MNEMONIC
        },
        providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      }),
      network_id: 11155111,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
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
          runs: 1
        },
        evmVersion: "istanbul",
      }
    }
  }
};
console.log('MNEMONIC from env:', process.env.MNEMONIC);
console.log('MNEMONIC length:', process.env.MNEMONIC ? process.env.MNEMONIC.trim().split(' ').length : 'undefined');
console.log('INFURA_PROJECT_ID:', process.env.INFURA_PROJECT_ID);
