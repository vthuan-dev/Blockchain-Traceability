const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,      // Port mặc định của Ganache UI
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000000,
      from: "0xc097c8c03F5dE0Ce2d7c3f941c0aB7AFBE6885F4" // Account đầu tiên từ Ganache
    },
    sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: [process.env.PRIVATE_KEY?.startsWith('0x') 
          ? process.env.PRIVATE_KEY.slice(2) 
          : process.env.PRIVATE_KEY],
        providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        chainId: 11155111
      }),
      network_id: 11155111,
      gas: 8000000,
      gasPrice: 50000000000,
      confirmations: 2,
      timeoutBlocks: 500,
      skipDryRun: true,
      networkCheckTimeout: 1000000
    }
  },

  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "paris"  // Thay đổi từ "london" sang "paris"
      }
    }
  }
};
