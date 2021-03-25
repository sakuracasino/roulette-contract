require('dotenv').config()
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" 
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(process.env.ROPSTEN_MNEMONIC, process.env.ROPSTEN_API)
      },
      network_id: 3,
      gas: 4000000
    }
  //  test: {
  //    host: "127.0.0.1",
  //    port: 7545,
  //    network_id: "*"
  //  }
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    },
  },
};
