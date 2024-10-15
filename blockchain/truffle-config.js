const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mnemonic = process.env.MNEMONIC.trim();
console.log('MNEMONIC raw:', mnemonic);
console.log('MNEMONIC length:', mnemonic.split(' ').length);

if (!mnemonic || mnemonic.split(' ').length !== 12) {
  console.error('MNEMONIC không hợp lệ hoặc không được định nghĩa');
  process.exit(1);
}

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      db_path: "./ganache-db"
    },
    sepolia: {
      provider: () => {
        return new HDWalletProvider({
          mnemonic: {
            phrase: mnemonic
          },
          providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        });
      },
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

console.log('MNEMONIC từ env:', mnemonic ? '******' : 'không xác định');
console.log('Độ dài MNEMONIC:', mnemonic ? mnemonic.trim().split(' ').length : 'không xác định');
console.log('ALCHEMY_API_KEY:', process.env.ALCHEMY_API_KEY ? '******' : 'không xác định');
