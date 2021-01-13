const BN = web3.utils.BN;
const Roulette = artifacts.require("Roulette");
const decimals = 100;
// const gas = 4712388;
// const gasPrice = 100000000000;
// const gasFee = new BN(gas).mul(new BN(gasPrice));
let roulette;

function db(obj) {
  const name = Object.keys(obj)[0];
  console.log(name, obj[name]);
}

async function getBalance(address) {
  return new BN(await web3.eth.getBalance(address));
}

async function getFee(_transaction) {
  const transaction = await (web3.eth.getTransaction(_transaction.tx))
  return new BN(_transaction.receipt.gasUsed).mul(new BN(transaction.gasPrice));
}

async function getTotalSpent(_transaction) {
  const transaction = await (web3.eth.getTransaction(_transaction.tx))
  const gas_fee = await getFee(_transaction);

  return Number(transaction.value) + Number(gas_fee);
}

async function addLiquidity(from, value) {
  const roulette = await Roulette.deployed();
  const add_liquidity_tx = await roulette.addLiquidity({from, value});
  return await getFee(add_liquidity_tx);
}

async function removeLiquidity(from) {
  const roulette = await Roulette.deployed();
  const remove_liquidity_tx = await roulette.removeLiquidity({from});
  return await getFee(remove_liquidity_tx);
}

function contractInteractor(contractInstance) {
  let accountFees = {};
  let accountInitial = {};

  return async function(config) {
    for(action of config) {
      const {props, expectedDiff, args, method, address, clear} = action;
      if(clear) {
        accountFees = {};
        accountInitial = {};
        continue;
      }
      if(expectedDiff !== undefined) {
        const currentBalance = await getBalance(address);
        const oldBalanceMinusFees = accountInitial[address].sub(accountFees[address] || new BN(0));
        assert.equal(
          currentBalance.sub(oldBalanceMinusFees).toString(),
          new BN(expectedDiff).toString()
        );
        continue;
      }
      if(props && props.from) {
        if (!accountFees[props.from]) {
          accountFees[props.from] = new BN(0);
          accountInitial[props.from] = await getBalance(props.from);
        }
      }
      const _tx = await contractInstance[method](...(args || []), props);
      if(props && props.from) {
        accountFees[props.from] = accountFees[props.from].add(await getFee(_tx));
      }
    }
  };
};

function rouletteInteractor(logs = false) {
  let _queue = [];
  const actions = {
    removeLiquidity: function ({address}) {
      _queue.push({
        method: 'removeLiquidity',
        props: {
          from: address,
        },
      });
      return actions;
    },
    addLiquidity: function ({address, amount}) {
      _queue.push({
        method: 'addLiquidity',
        props: {
          from: address,
          value: amount,
        },
      });
      return actions;
    },
    bet: function ({address, amount, betNumber}) {
      _queue.push({
        method: 'bet',
        args: [betNumber],
        props: {
          from: address,
          value: amount,
        },
      });
      return actions;
    },
    assertAddressDiff: function ({address, diff}) {
      _queue.push({
        address,
        expectedDiff: diff,
      });
      return actions;
    },
    artificiallyGrow({address, amount}) {
      _queue.push({
        method: 'receive',
        props: {
          from: address,
          value: amount,
        },
      });
      return actions;
    },
    run: async function () {
      const roulette = contractInteractor(await Roulette.deployed());
      await roulette([..._queue, {clear: true}]);
      _queue = [];
      return actions;
    }
  };
  return actions;
}


contract('Roulette', async (accounts) => {
  it('should add and remove balance', async () => {
    const roulette = await Roulette.deployed();
    const initial_balance = await getBalance(accounts[0]);

    const add_liquidity_tx = await roulette.addLiquidity({
      from: accounts[0],
      value: new BN(200)
    });
    const add_liquidity_fee = await getFee(add_liquidity_tx);

    assert.equal(
      (await getBalance(accounts[0])).toString(),
      initial_balance.sub(new BN(200)).sub(add_liquidity_fee).toString(),
    );

    const remove_liquidity_tx = await roulette.removeLiquidity({
      from: accounts[0],
    });
    const remove_liquidity_fee = await getFee(remove_liquidity_tx);
    assert.equal(
      (await getBalance(accounts[0])).toString(),
      initial_balance.sub(add_liquidity_fee).sub(remove_liquidity_fee).toString()
    );
  });
  it('should add and remove balance with two accounts', async () => {
    const initial_balance_1 = await getBalance(accounts[1]);
    const initial_balance_2 = await getBalance(accounts[2]);
    let fees_1 = new BN(0);
    let fees_2 = new BN(0);

    fees_1 = fees_1.add(await addLiquidity(accounts[1], 5000));
    fees_2 = fees_2.add(await addLiquidity(accounts[2], 5000));
    fees_1 = fees_1.add(await removeLiquidity(accounts[1]));
    assert.equal(
      (await getBalance(accounts[1])).toString(),
      initial_balance_1.sub(fees_1).toString()
    );
    assert.equal(
      (await getBalance(accounts[2])).toString(),
      initial_balance_2.sub(new BN(5000)).sub(fees_2).toString()
    );
  });
  it('should add and remove balance when balance grows', async () => {
    const roulette = await Roulette.deployed();
    await removeLiquidity(accounts[2]);

    const initial_balance_1 = await getBalance(accounts[1]);
    const initial_balance_2 = await getBalance(accounts[2]);

    let fees_1 = new BN(0);
    let fees_2 = new BN(0);

    // add liquidity
    fees_1 = fees_1.add(await addLiquidity(accounts[1], 5000));
    fees_2 = fees_2.add(await addLiquidity(accounts[2], 5000));

    // increase contract balance
    await roulette.receive({
      from: accounts[0],
      value: 5000,
    });

    // withdraw liquidity
    fees_1 = fees_1.add(await removeLiquidity(accounts[1]));
    fees_2 = fees_2.add(await removeLiquidity(accounts[2]));
    
    assert.equal(
      (await getBalance(accounts[1])).toString(),
      initial_balance_1.add(new BN(2500)).sub(fees_1).toString()
    );
    assert.equal(
      (await getBalance(accounts[2])).toString(),
      initial_balance_2.add(new BN(2500)).sub(fees_2).toString()
    );
  });
  it('should persist liquidity from balances', async () => {
    const interactor = rouletteInteractor();

    await interactor
      .addLiquidity({address: accounts[0], amount: 35})
      .assertAddressDiff({address: accounts[0], diff: -35})
      .removeLiquidity({address: accounts[0]})
      .assertAddressDiff({address: accounts[0], diff: 0})
      .run();

    await interactor
      .addLiquidity({address: accounts[1], amount: 100000000})
      .addLiquidity({address: accounts[2], amount: 1})
      .addLiquidity({address: accounts[3], amount: 4567})
      .removeLiquidity({address: accounts[1]})
      .removeLiquidity({address: accounts[2]})
      .removeLiquidity({address: accounts[3]})
      .assertAddressDiff({address: accounts[1], diff: 0})
      .assertAddressDiff({address: accounts[2], diff: 0})
      .assertAddressDiff({address: accounts[3], diff: 0})
      .run();
  });
  it('should persist liquidity from multiple balances with increases', async () => {
    let interactor = rouletteInteractor();

    async function testLiquidityWithIncrements(deposits = [], increase = 4000) {
      let totalLiquidity = deposits.reduce((_, x) => _+x, 0);
      deposits.forEach((balance, index) => {
        interactor.addLiquidity({address: accounts[1+index], amount: balance})        
      });
      interactor.artificiallyGrow({amount: increase, address: accounts[0]});
      deposits.forEach((_, index) => {
        interactor.removeLiquidity({address: accounts[1+index]})        
      });
      let totalGains = increase;
      deposits.forEach((balance, index) => {
        const share = balance / totalLiquidity;
        const gain = Math.floor(share*totalGains);
        interactor.assertAddressDiff({
          address: accounts[1+index],
          diff: gain
        })
        totalLiquidity -= balance;
        totalGains -= gain;
      });
      await interactor.run();
    };

    await testLiquidityWithIncrements([33, 71, 101]);
    await testLiquidityWithIncrements([10000000, 1, 13], 600000000000);
    await testLiquidityWithIncrements([100000000000000, 1, 1], 1);
    await testLiquidityWithIncrements([100000000000000, 100000000000000, 1], 478);
  });
});
