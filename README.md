Crypto Roulette
---

### Checklist
- [x] Implement contract pooling
- [x] Implement color betting with blockhash-based random 
- [x] Implement tests for liquidity and bets
- [ ] Deploy v0.1 in eth testnet
- [ ] Implement v0.2: Chainlink VRF + blockhash for random
- [ ] Implement v0.3: bet queue + Chainlink VRF
- [ ] Implement v0.4: bet queue + RANDAO + Chainlink VRF
- [ ] Implement v0.5: bet queue + RANDAO + Chainlink VRF
- [ ] Investigate v0.6: bet queue + RANDAO + Custom oracle
- [ ] Investigate v0.7: bet queue + RANDAO + blockhash delay?
- [ ] Investigate implementations in POLKADOT/TRON/Binance-SmartChain 
- [ ] Implement basic UI for providing liquidity and bets, use `.github.io` domain
- [ ] Deploy v1.0b into testnets and stress test validations
- [ ] Deploy v1.0stable into the mainnet

### Running the project
1. Run `make install` for installing node dependencies
2. Run `make run` for running the ganache server

_You can run the GUI instead of doing make run, just make sure that ganache server is on port 8545_

Additional commands:
```
`make compile` compiles the contracts
`make migrate` migrates the contracts into the ganache blockchain
`make console` lauch a truffle console in the gananche node
`make test` run tests
```