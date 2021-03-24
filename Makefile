.PHONY: test run install console migrate compile

TEST_ADDRESS="0x5fec42b462517CE7976ff6f88238bd360a457FD4"
TEST_PRIVATE_KEY="0xba6dae424d337e171d6f610fdea86132c45f04f897bcfef91590b9a833c1fdca"

install:
	npm install

run:
	./node_modules/.bin/ganache-cli -e 5000 --port 8545 --unlock ${TEST_ADDRESS}

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
