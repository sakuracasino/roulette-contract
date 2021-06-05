SakuraCasino Roulette
---
[![CircleCI](https://circleci.com/gh/sakuracasino/roulette-contract.svg?style=svg)](https://circleci.com/gh/sakuracasino/roulette-contract)

![](https://github.com/ivandiazwm/crypto-roulette/blob/master/preview.jpg?raw=true)

## Usage
To install this package, just run
```
npm install @sakuracasino/roulette-contract --save
```

Then you can request the abi or address
```js
const {abi, networks} = require('@sakuracasino/roulette-contract');

console.log(abi); // returns the ABI for the Roulette contract
console.log(networks[0].contract_address); // returns the contract address in the kovan network
```

## Development

### Checklist
- [x] Implement contract pooling
- [x] Implement color betting with blockhash-based random 
- [x] Implement tests for liquidity and bets
- [x] Deploy v0.1 in eth testnet
- [x] Implement all bets
- [x] Implement UI for bets
- [x] Implement Chainlink VRF
- [x] Update UI to wait for VRF callback
- [x] Implement bet fee
- [x] Implement correct DAI permit interface
- [x] Implement bet limit
- [x] Allow for non-EIP-2612 tokens
- [ ] Improve contact storage management, delete unused data. Use mainly events.
- [ ] Revision liquidity and max bet limits security
- [ ] Implement Chainlink VRF + bet queue
- [ ] Migrate dev environment to Hardhat
- [ ] Deploy v1.0b into Matic testnet
- [ ] Investigate implementations with ETH 2.0 Bacon chain VDF and Polkadot BABE VRF
- [ ] Deploy v1.0stable into Matic or BSC mainnet

### Running the project
1. Run `make install` for installing node dependencies
2. Run `make run` for running the ganache server
3. Run `make test` for checking everything is ok

_You can run the GUI instead of doing "make run", just make sure that ganache server is on port 8545_

4. Run `make migrate` for deploying the contracts in the local ganache testnet. It will return the env variables for the frontend ui. You've to paste them there if you also want to run the UI.
5. Run `make vrfsigner`. It starts a mock of a VRFCoodrinator operator oracle. If you don't run this, bet requests will always de pending. 
_Disclamer: remember that you can't run `make test` while `vrfsigner`is running._

Additional commands:
```
`make compile` compiles the contracts
`make migrate` migrates the contracts into the ganache blockchain
`make console` lauch a truffle console in the gananche node
`make test` run tests
```
#### Publish a new package version
The npm package associated with this repository just exposes information. It contains:
* Roulette contract abi
* Information about the contract in different networks such as addresses.

If you deploy the contract in a network, you need to update the file `networks.js` with the associated information, if the network doesn't exist yet, just add a new entry in networks.

To deploy a new package version:
1. Update `networks.js` as mentioned above.
2. Make sure to update both `package.json` and `package-lock.json` versions to the desired version to publish.
3. Run `make publish` and it will try to publish in `npmjs.org` and success if you have permission.
_Disclaimer: the contract you currently have in the repo should match the same which is deployed in the specified contract address of each network_

### How to Deploy the contract with Remix

1. Run `make flatten` and it will return a flatten `_Roulette.sol` contract.
2. Copy `_Roulette.sol` into your Remix environment and deploy the contract where you want.

### How to Deploy the contract (DEPRECATED)

1. Make sure you have defined the network description under `networks.js`. `contract_address` can be empty.
2. Make sure you have correct API and MNEMONIC in the `.env` file
3. Define `NETWORK` variable as the network name and then call `make deploy-live`. For example, to deploy to `kovan` you can `NETWORK=kovan make deploy-live`.
4. Optionally, there's some predefined commands like `make deploy-kovan` for common networks.
5. Once deployed, please update the contract address under `networks.js`
6. You can call `make flatten` to have a flatten `_Roulette.sol` contract for verifying it on etherscan.
