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

test:
	./node_modules/.bin/truffle test --network ganache

deploy-ropsten:
	./node_modules/.bin/truffle deploy --network ropsten
