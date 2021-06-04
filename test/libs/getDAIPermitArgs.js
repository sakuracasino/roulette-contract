// Based on https://github.com/Uniswap/uniswap-v2-core/blob/master/test/shared/utilities.ts#L52
const { MaxUint256 } = require('ethers/constants');
const { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack} = require('ethers/utils');
const { ecsign } = require('ethereumjs-util');

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)')
);

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
  expiry
) {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'bool'],
            [PERMIT_TYPEHASH, approve.holder, approve.spender, nonce, expiry, 'true']
          )
        )
      ]
    )
  )
}

module.exports = async function getPermitArgs({
  token,
  spenderAddress,
  owner,
  expiry = MaxUint256.toString()
}) {
  const nonce = (await token.nonces(owner.address)).toString();
  const digest = await getApprovalDigest(
    token,
    { holder: owner.address, spender: spenderAddress},
    nonce,
    expiry
  );
  const { v, r, s } = ecsign(
    Buffer.from(digest.slice(2), 'hex'),
    Buffer.from(owner.privateKey.slice(2), 'hex')
  );

  return [
    nonce,
    expiry,
    true,
    `${v}`,
    r,
    s,
    {from: owner.address}
  ];
};