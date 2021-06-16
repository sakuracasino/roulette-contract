const { expandTo18Decimals, collapseTo18Decimals } = require('./decimals');
const DAIMock = artifacts.require('Dai');

module.exports = {
  async balanceOf(address) {
    const dai = await DAIMock.deployed();
    return collapseTo18Decimals((await dai.balanceOf(address)).toString());
  },
  async mint(address, amount) {
    const dai = await DAIMock.deployed();
    return await dai.mint(address, expandTo18Decimals(amount).toString());
  },
  async burn(address, amount) {
    const dai = await DAIMock.deployed();
    return await dai.burn(address, expandTo18Decimals(amount).toString(), {from: address});
  },
  async getToken() {
    return await DAIMock.deployed();
  }
};
