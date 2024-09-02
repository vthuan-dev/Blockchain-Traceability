module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      db_path: "./ganache-db"
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
          enabled: false,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  }
};