const { bigNumberify } = require('ethers/utils');

function expandTo18Decimals(n) {
  if (Math.floor(n) !== n) {
    n = Math.floor(n * 10**6);
    return bigNumberify(n).mul(bigNumberify(10).pow(12));
  }
  return bigNumberify(n).mul(bigNumberify(10).pow(18))
}

function collapseTo18Decimals(n) {
  if (!n.pow) {
    n = bigNumberify(n);
  }
  return Number(n.toString().slice(0, -12))/(10**6);
}

module.exports = {
  expandTo18Decimals,
  collapseTo18Decimals,
};