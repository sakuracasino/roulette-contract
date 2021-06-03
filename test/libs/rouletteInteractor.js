const Web3 = require('web3');
const fs = require('fs');
const { getDeployerWallet } = require('./wallets');
const { expandTo18Decimals, collapseTo18Decimals } = require('./decimals');
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
    await daiMockInteractor.mint(roulette.address, amount);
    return await roulette.forceAddLiquidity(expandTo18Decimals(amount).toString(), {from: getDeployerWallet().address});
  },
  async burnDai(amount) {
    const roulette = await Roulette.deployed();
    await daiMockInteractor.burn(roulette.address, amount);
    return await roulette.forceRemoveLiquidity(expandTo18Decimals(amount).toString(), {from: getDeployerWallet().address});
  },
  async rollBets(wallet, bets, randomSeed, _fee = 0) {
    const roulette = await Roulette.deployed();
    const amount = bets.reduce((_amount, bet) => _amount + bet.amount, 0);
    const fee = _fee || (await this.getBetFee());
    await roulette.rollBets(
      bets.map(bet => ({...bet, amount: expandTo18Decimals(bet.amount).toString()})),
      randomSeed,
      ...(await getPermitArgs({
        token: await daiMockInteractor.getToken(),
        spenderAddress: roulette.address,
        owner: wallet,
        amount: expandTo18Decimals(amount + fee).toString()
      }))
    );
    await signLastBlockVRFRequest(randomSeed);    
  },
  async setBetFee(amount) {
    const roulette = await Roulette.deployed();
    return await roulette.setBetFee(expandTo18Decimals(amount), {from: getDeployerWallet().address});
  },
  async getBetFee() {
    const roulette = await Roulette.deployed();
    const betFee = await roulette.getBetFee();
    return collapseTo18Decimals(betFee);
  },
  async withdrawFees() {
    const roulette = await Roulette.deployed();
    return await roulette.withdrawFees({from: getDeployerWallet().address});
  },
  async getCollectedFees() {
    const roulette = await Roulette.deployed();
    return collapseTo18Decimals(await roulette.getCollectedFees());
  },
};