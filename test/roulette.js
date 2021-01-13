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

// function contractInteractor(contract, assert) {
//   const accountFees = {};
//   const accountInitial = {};

//   /*
//   [
//     {
//       method: '',
//       args: [],
//       props: {}
//     },
//     {
//       address: '',
//       expectedDiff: 0
//     }
//   ]
//    */
//   return function (config) {
//     for(action in config) {
//       if(action.expectedDiff) {
//         assert.equal(
//           (await getBalance(address)).toString(),
//           accountInitial[address]
//             .add(new BN(action.expectedDiff))
//             .sub(accountFees[address] || new BN(0))
//             .toString()
//         );
//         return;
//       }
//       if(props && props.from) {
//         if (!accountFees[props.from]) {
//           accountFees[props.from] = new BN(0);
//           accountInitial[props.from] = await getBalance(address);
//         }
//       }
//       const _tx = await contract[action.method].call(...args, props);
//       if(props && props.from) {
//         accountFees[props.from] = accountFees[props.from].add(await getFee(_tx));
//       }
//     }
//   }
// }


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

    console.log('balance_1', initial_balance_1.toString());
    console.log('balance_1', fees_1.toString());
    console.log('balance_1', (await getBalance(accounts[1])).toString());
    console.log('balance_2', initial_balance_2.toString());
    console.log('balance_2', fees_2.toString());
    console.log('balance_2', (await getBalance(accounts[2])).toString());
    
    assert.equal(
      (await getBalance(accounts[1])).toString(),
      initial_balance_1.add(new BN(2500)).sub(fees_1).toString()
    );
    assert.equal(
      (await getBalance(accounts[2])).toString(),
      initial_balance_2.add(new BN(2500)).sub(fees_2).toString()
    );
  });
});
