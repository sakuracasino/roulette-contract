.PHONY: test run install console migrate compile

file := .mnemonic
MNEMONIC := $(shell cat ${file})
install:
	npm install

run:
	./node_modules/.bin/ganache-cli -e 5000 --port 8545 --mnemonic "$(MNEMONIC)"

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

deploy-live:
	./node_modules/.bin/truffle deploy --network live

deploy-kovan:
	NETWORK=kovan make deploy-live

publish:
	make compile
	node package-builder.js
	npm publish --access public