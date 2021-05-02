const { bigNumberify } = require('ethers/utils');
const Web3 = require('web3');
const fs = require('fs');
const getPermitArgs = require('./getPermitArgs');
const Roulette = artifacts.require('Roulette');
const VRFCoordinatorMock = artifacts.require('VRFCoordinatorMock');
const daiMockInteractor = require('./daiMockInteractor');

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const rouletteJSON = JSON.parse(fs.readFileSync('./build/contracts/Roulette.json', 'utf8'));  
const rouletteWeb3 = new web3.eth.Contract(rouletteJSON.abi,Roulette.address);

async function signLastBlockVRFRequest(value) {
  const vrfCoordinator = await VRFCoordinatorMock.deployed();
  const previousRequests = await rouletteWeb3.getPastEvents('BetRequest', {fromBlock: 'latest', toBlock: 'latest'});
  for (let i = 0; i < previousRequests.length; i++) {
    const requestId = previousRequests[i].returnValues.requestId;
    if (!(await rouletteWeb3.methods.isRequestCompleted(requestId).call())) {
      await vrfCoordinator.callBackWithRandomness(requestId, value, Roulette.address);
    }
  }
}

function expandTo18Decimals(n) {
  return bigNumberify(n).mul(bigNumberify(10).pow(18))
}

function collapseTo18Decimals(n) {
  return bigNumberify(n).div(bigNumberify(10).pow(18))
}

module.exports = {
  async addLiquidity(wallet, _amount) {
    const roulette = await Roulette.deployed();
    const amount = expandTo18Decimals(_amount).toString();
    return await roulette.addLiquidity(
      amount,
      ...(await getPermitArgs({
        token: await daiMockInteractor.getToken(),
        spenderAddress: roulette.address,
        owner: wallet,
        amount,
      }))
    );
  },
  async removeLiquidity(wallet) {
    const roulette = await Roulette.deployed();
    return await roulette.removeLiquidity({from: wallet.address});
  },
  async getTotalLiquidity() {
    const roulette = await Roulette.deployed();
    return await daiMockInteractor.balanceOf(roulette.address);
  },
  async mintDAI(amount) {
    const roulette = await Roulette.deployed();
    return await daiMockInteractor.mint(roulette.address, amount);
  },
  async burnDai(amount) {
    const roulette = await Roulette.deployed();
    return await daiMockInteractor.burn(roulette.address, amount);
  },
  async rollBets(wallet, bets, randomSeed) {
    const roulette = await Roulette.deployed();
    const amount = bets.reduce((_amount, bet) => _amount + bet.amount, 0);
    await roulette.rollBets(
      bets.map(bet => ({...bet, amount: expandTo18Decimals(bet.amount).toString()})),
      randomSeed,
      ...(await getPermitArgs({
        token: await daiMockInteractor.getToken(),
        spenderAddress: roulette.address,
        owner: wallet,
        amount: expandTo18Decimals(amount).toString()
      }))
    );
    await signLastBlockVRFRequest(randomSeed);    
  }
};