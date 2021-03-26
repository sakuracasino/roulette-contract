Crypto Roulette
---
![](https://github.com/ivandiazwm/crypto-roulette/blob/master/preview.jpg?raw=true)

### Checklist
- [x] Implement contract pooling
- [x] Implement color betting with blockhash-based random 
- [x] Implement tests for liquidity and bets
- [x] Deploy v0.1 in eth testnet
- [x] Implement v0.2: Implement all bets
- [ ] Implement UI for providing liquidity and bets
- [ ] Implement v0.3: Implement Chainlink VRF
- [ ] Update UI to wait for VRF callback
- [ ] Implement v0.4: Implement liquidity and max bet limits
- [ ] Implement v0.5: Implement Chainlink VRF + bet queue
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
Difine an .env for deployments on Ropsten and the main network
```
ROPSTEN_MNEMONIC='Your mnemonic'
ROPSTEN_API='You api url + key'
```