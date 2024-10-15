const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: '../.env' });

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      db_path: "./ganache-db"
    },
    goerli: {
      provider: () => {
        if (!process.env.MNEMONIC) {
          throw new Error("MNEMONIC không được định nghĩa trong file .env");
        }
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        );
      },
      network_id: 5,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    sepolia: {
      provider: () => {
        if (!process.env.MNEMONIC) {
          throw new Error("MNEMONIC không được định nghĩa trong file .env");
        }
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        );
      },
      network_id: 11155111, // ID mạng của Sepolia
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
