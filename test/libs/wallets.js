const bip39 = require('bip39');
const { hdkey } = require('ethereumjs-wallet');
const fs = require('fs');
const lodash = require('lodash');

const mnemonic = fs.readFileSync('.mnemonic', 'utf8').toString()

const seed = bip39.mnemonicToSeedSync(mnemonic); // mnemonic is the string containing the words
const hdk = hdkey.fromMasterSeed(seed);

module.exports = lodash.range(10).map(index => {
  const addr_node = hdk.derivePath(`m/44'/60'/0'/0/${index}`);
  return {
    address: addr_node.getWallet().getAddressString(),
    privateKey: addr_node.getWallet().getPrivateKeyString(),
  };
});