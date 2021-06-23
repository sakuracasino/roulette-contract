const colors = require('colors/safe');
const Roulette = artifacts.require("RouletteDev");
const daiMock = artifacts.require("Dai");
const linkTokenMock = artifacts.require("LinkToken");
const VRFCoordinatorMock = artifacts.require("VRFCoordinatorMock");

module.exports = async function(deployer, environment) {
  if (environment === 'ganache') {
    const fee = '100000000000000000';
    const keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4';

    await deployer.deploy(daiMock, '1').then(async (daiToken) => {
      const linkToken = await deployer.deploy(linkTokenMock);
      const vrfCoordinator = await deployer.deploy(VRFCoordinatorMock, linkToken.address);
      const roulette = await deployer.deploy(
        Roulette,
        daiToken.address,
        vrfCoordinator.address,
        linkToken.address,
        keyHash,
        fee
      );
  
      if (process.env.INITIAL_LIQUIDITY) {
        const intialLiquidity = web3.utils.toWei(process.env.INITIAL_LIQUIDITY, 'ether');
        await daiToken.mint(roulette.address, intialLiquidity);
        await roulette.forceAddLiquidity(intialLiquidity);
      }
      await roulette.setBetFee(web3.utils.toWei('0.01', 'ether'));
      await linkToken.transfer(roulette.address, web3.utils.toWei('100000', 'ether'));
  
      console.log(colors.cyan('Copy paste these varaibles into your frontend .env file'));
      console.log(colors.cyan('============================================'));
      console.log(`BET_TOKEN_ADDRESS='${daiToken.address}'`);
      console.log(`ROULETTE_ADDRESS='${roulette.address}'`);
      console.log(colors.cyan('============================================'));  
    }).catch((e) => console.error(e));
  } else {
    throw 'Invalid network';
    // TODO: Figure out automated deployments
    /*
    const network = networks.find(network => network.network_name === process.env.NETWORK);
    if (!network) {
      throw 'Invalid network';
    }
    const daiToken = await deployer.deploy(daiMock, await web3.utils.toWei('0', 'ether'));
    await deployer.deploy(
      Roulette,
      daiToken.address,
      network.vrf_coordinator_address,
      network.link_token_address,
      network.keyHash,
      network.vrf_fee
    );*/
  }
};
