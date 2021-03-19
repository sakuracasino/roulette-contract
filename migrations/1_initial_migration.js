const Roulette = artifacts.require("Roulette");
const daimock = artifacts.require("daimock");

module.exports = async function(deployer) {
  const dai = await deployer.deploy(daimock, "10000000000000000000000");
  deployer.deploy(Roulette, dai.address);
};
