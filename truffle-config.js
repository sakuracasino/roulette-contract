require('dotenv').config()
const networks = require('./networks');
const HDWalletProvider = require("@truffle/hdwallet-provider");
let network = {};

if (process.env.NETWORK) {
  network = networks.find(network => network.network == process.env.NETWORK);
  if(!network) {
    throw 'Invalid network name';
  }
}

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
    live: {
      provider: function() {
        return new HDWalletProvider(process.env.DEPLOY_MNEMONIC, process.env.DEPLOY_API)
      },
      chain_id: network.chain_id,
      network_id: network.network,
      gas: 8000000
    }
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    },
  },
};
