const Web3 = require('web3');
const fs = require('fs');
const Roulette = artifacts.require('Roulette');
const VRFCoordinatorMock = artifacts.require('VRFCoordinatorMock');
const colors = require('colors/safe')

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

module.exports = async () => {
  console.log(colors.cyan('Intiliazing random signer...'));
  const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
  const rouletteJSON = JSON.parse(fs.readFileSync('./build/contracts/Roulette.json', 'utf8'));  
  const roulette = new web3.eth.Contract(
    rouletteJSON.abi,
    Roulette.address
  );
  const vrfCoordinator = await VRFCoordinatorMock.deployed();

  const resolveRequestId = async (requestId) => {
    console.log(colors.gray(`Request received: ${requestId}`));
    const random = getRandomInt(37);
    await vrfCoordinator.callBackWithRandomness(requestId, random, Roulette.address);
    console.log(colors.green(`Resolved ${requestId.slice(0,5)}...${requestId.slice(-5)} with ${random}`));
  };
  roulette.events.RequestedRandomness(async (error, data) => resolveRequestId(data.returnValues.requestId));

  console.log(colors.gray('Resolving queued requests...'));
  const previousRequests = await roulette.getPastEvents('BetRequest', {fromBlock: 0, toBlock: 'latest'});
  for (let i = 0; i < previousRequests.length; i++) {
    const requestId = previousRequests[i].returnValues.requestId;
    if (!(await roulette.methods.isRequestCompleted(requestId).call())) {
      await resolveRequestId(requestId);
    }
  }
  console.log(colors.gray('Done.'));

  console.log(colors.yellow('Random signer is up and running!'));
};