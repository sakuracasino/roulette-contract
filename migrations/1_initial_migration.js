const Roulette = artifacts.require("Roulette");
const daimock = artifacts.require("daimock");

module.exports = function(deployer) {
  deployer.deploy(daimock, web3.utils.toWei('0', 'ether')).then(
    (dai) => deployer.deploy(Roulette, dai.address)
  )
};
