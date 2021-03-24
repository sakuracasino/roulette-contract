const { signERC2612Permit } = require("eth-permit");
const { soliditySha3 } = require("web3-utils");
const { MaxUint256 } = require('ethers/constants');
const { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack} = require('ethers/utils');
const { ecsign } = require('ethereumjs-util');

const BN = web3.utils.BN;
const Roulette = artifacts.require("Roulette");
const DAIMock = artifacts.require("DAIMock");
const decimals = 100;
// const gas = 4712388;
// const gasPrice = 100000000000;
// const gasFee = new BN(gas).mul(new BN(gasPrice));
let roulette, dai;


contract('Roulette', async (accounts) => {
  it('should add and remove balance', async () => {
    console.log('accounts', accounts);
    roulette = await Roulette.deployed();
    dai = await DAIMock.deployed();
    const wallet = web3.eth.accounts.privateKeyToAccount('0xba6dae424d337e171d6f610fdea86132c45f04f897bcfef91590b9a833c1fdca');
    console.log('wallet', wallet);
    web3.eth.sendTransaction({to:wallet.address, from: accounts[1], value:web3.utils.toWei("10", "ether")})
    await dai.mint(wallet.address, web3.utils.toWei('150', 'ether'))
    console.log('dai: ', (await dai.balanceOf(wallet.address)).toString())

    const PERMIT_TYPEHASH = keccak256(
      toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
    )
    function getDomainSeparator(name, tokenAddress) {
      return keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            1,
            tokenAddress
          ]
        )
      )
    }
    async function getApprovalDigest(
      token,
      approve,
      nonce,
      deadline
    ) {
      const name = await token.name()
      const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
      console.log('xd', [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]);
      return keccak256(
        solidityPack(
          ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
          [
            '0x19',
            '0x01',
            DOMAIN_SEPARATOR,
            keccak256(
              defaultAbiCoder.encode(
                ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
              )
            )
          ]
        )
      )
    }

    function expandTo18Decimals(n) {
      return bigNumberify(n).mul(bigNumberify(10).pow(18))
    }

    const TEST_AMOUNT = expandTo18Decimals(30).toString()

    const nonce = await dai.nonces(wallet.address);
    console.log('nonce', nonce)
    const deadline = MaxUint256;
    const digest = await getApprovalDigest(
      dai,
      { owner: wallet.address, spender: roulette.address, value: TEST_AMOUNT},
      nonce.toString(),
      deadline.toString()
    );
    console.log('digest', digest);
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))
    console.log('result', { v, r, s });
    const tx = await roulette.addLiquidity(
      TEST_AMOUNT,
      deadline,
      v,
      r,
      s,
      {from: wallet.address}
    );
    // console.log(tx);
    console.log('dai user: ', (await dai.balanceOf(wallet.address)).toString());
    console.log('dai roulete: ', (await dai.balanceOf(roulette.address)).toString());
    console.log('sakura tokens: ', (await roulette.balanceOf(wallet.address)).toString());
    // const txParams = {
    //   nonce: await web3.eth.getTransactionCount(accounts[1]),
    //   gasLimit: 80000,
    //   to: dai.address,
    //   data: erc20Permit.methods
    //     .permit(
    //       defaultSender,
    //       defaultSpender,
    //       value,
    //       result.deadline,
    //       result.v,
    //       result.r,
    //       result.s
    //     )
    //     .encodeABI(),
    // };

  });
});
