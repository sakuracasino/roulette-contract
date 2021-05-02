.PHONY: test run install console migrate compile

file := .mnemonic
MNEMONIC := $(shell cat ${file})
install:
	npm install

run:
	./node_modules/.bin/ganache-cli -e 5000 --port 8545 --mnemonic "$(MNEMONIC)" --chainId 1

console:
	./node_modules/.bin/truffle console --network ganache

migrate:
	./node_modules/.bin/truffle migrate --network ganache --reset

compile:
	./node_modules/.bin/truffle compile

flatten:
	./node_modules/.bin/truffle-flattener ./contracts/Roulette.sol > ./contracts/_Roulette.sol

test:
	./node_modules/.bin/truffle test --network ganache

vrfsigner:
	./node_modules/.bin/truffle exec ./scripts/vrf-signer-mock.js --network ganache

publish:
	make compile
	node scripts/package-builder.js
	npm publish --access public