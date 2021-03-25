const { bigNumberify } = require('ethers/utils');
const DAIMock = artifacts.require('DAIMock');

function expandTo18Decimals(n) {
  return bigNumberify(n).mul(bigNumberify(10).pow(18))
}

function collapseTo18Decimals(n) {
  return bigNumberify(n).div(bigNumberify(10).pow(18))
}

module.exports = {
  async balanceOf(address) {
    const dai = await DAIMock.deployed();
    return collapseTo18Decimals((await dai.balanceOf(address)).toString()).toNumber();
  },
  async mint(address, amount) {
    const dai = await DAIMock.deployed();
    return await dai.mint(address, expandTo18Decimals(amount).toString());
  },
  async burn(address, amount) {
    const dai = await DAIMock.deployed();
    return await dai.burn(address, expandTo18Decimals(amount).toString());
  },
  async getToken() {
    return await DAIMock.deployed();
  }
};
