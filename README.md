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
```
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
- [ ] Implement liquidity and max bet limits
- [ ] Implement Chainlink VRF + bet queue
- [ ] Deploy v1.0b into Matic or BSC testnet
- [ ] Investigate implementations with BSC and Polkadot BABE VRF
- [ ] Deploy v1.0stable into Matic or BSC mainnet

### Running the project
1. Run `make install` for installing node dependencies
2. Run `make run` for running the ganache server
2. Run `make test` for checking everything is ok

_You can run the GUI instead of doing make run, just make sure that ganache server is on port 8545_

Additional commands:
```
`make compile` compiles the contracts
`make migrate` migrates the contracts into the ganache blockchain
`make console` lauch a truffle console in the gananche node
`make test` run tests
`make deploy-ropsten` deploys the contract to the ropsten network
```
#### .env file
Define an .env for deployments on testnets or mainnets
```
DEPLOY_MNEMONIC='Your mnemonic'
DEPLOY_API='You api url + key'
```

### How to Deploy the contract

1. Make sure you have defined the network description under `networks.js`. `contract_address` can be empty.
2. Make sure you have correct API and MNEMONIC in the `.env` file
3. Define `NETWORK` variable as the network name and then call `make deploy-live`. For example, to deploy to `kovan` you can `NETWORK=kovan make deploy-live`.
4. Optionally, there's some predefined commands like `make deploy-kovan` for common networks.
5. Once deployed, please update the contract address under `networks.js`
6. You can call `make flatten` to have a flatten `_Roulette.sol` contract for verifying it on etherscan.

### Publish a new package
First, make sure to update the version in `package.json`, then run `make publish`