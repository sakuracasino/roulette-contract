const Roulette = artifacts.require("Roulette");
const daimock = artifacts.require("DAIMock");
const networks = require("../networks");

module.exports = function(deployer, environment) {
  if(environment === 'ganache') {
    deployer.deploy(daimock, web3.utils.toWei('0', 'ether')).then(
      (dai) => deployer.deploy(Roulette, dai.address)
    );
  } else {
    const network = networks.find(network => network.network === process.env.NETWORK);
    if (!network) {
      throw 'Invalid network';
    }
    deployer.deploy(Roulette, network.dai_address);
  }
};
