const wallets = require('./libs/wallets');
const rouletteInteractor = require('./libs/rouletteInteractor');
const daiMockInteractor = require('./libs/daiMockInteractor');

contract('Roulette', async () => {
  it('should add liquidity', async () => {
    const wallet = wallets[0];
    await daiMockInteractor.mint(wallet.address, 150);
    await rouletteInteractor.addLiquidity(wallet, 30);
    assert.equal(120, await daiMockInteractor.balanceOf(wallet.address));
    assert.equal(30, await rouletteInteractor.getTotalLiquidity());
  });
  it('should remove liquidity', async () => {
    const wallet = wallets[0];
    await rouletteInteractor.removeLiquidity(wallet);
    assert.equal(150, await daiMockInteractor.balanceOf(wallet.address));
    assert.equal(0, await rouletteInteractor.getTotalLiquidity());
  });

  it('should add and remove liquidity for multiple providers', async () => {
    const wallet1 = wallets[0];
    const wallet2 = wallets[1];
    const wallet3 = wallets[2];
    await daiMockInteractor.mint(wallet2.address, 150);
    await daiMockInteractor.mint(wallet3.address, 150);

    // Check adding liquidity
    await rouletteInteractor.addLiquidity(wallet1, 50);
    await rouletteInteractor.addLiquidity(wallet2, 50);
    await rouletteInteractor.addLiquidity(wallet3, 50);
    assert.equal(100, await daiMockInteractor.balanceOf(wallet1.address));
    assert.equal(100, await daiMockInteractor.balanceOf(wallet2.address));
    assert.equal(100, await daiMockInteractor.balanceOf(wallet3.address));
    assert.equal(150, await rouletteInteractor.getTotalLiquidity());

    // Check removing liquidity
    await rouletteInteractor.removeLiquidity(wallet1);
    await rouletteInteractor.removeLiquidity(wallet2);
    await rouletteInteractor.removeLiquidity(wallet3);
    assert.equal(150, await daiMockInteractor.balanceOf(wallet1.address));
    assert.equal(150, await daiMockInteractor.balanceOf(wallet2.address));
    assert.equal(150, await daiMockInteractor.balanceOf(wallet3.address));
    assert.equal(0, await rouletteInteractor.getTotalLiquidity());
  });
  it('should withdraw more when pool increases', async () => {
    const wallet1 = wallets[0];
    const wallet2 = wallets[1];
    const wallet3 = wallets[2];

    // Check pool positve returns
    await rouletteInteractor.addLiquidity(wallet1, 50);
    await rouletteInteractor.addLiquidity(wallet2, 50);
    await rouletteInteractor.addLiquidity(wallet3, 50);
    await rouletteInteractor.mintDAI(150);
    assert.equal(300, await rouletteInteractor.getTotalLiquidity());
    await rouletteInteractor.removeLiquidity(wallet1);
    await rouletteInteractor.removeLiquidity(wallet2);
    await rouletteInteractor.removeLiquidity(wallet3);
    assert.equal(0, await rouletteInteractor.getTotalLiquidity());
    assert.equal(200, await daiMockInteractor.balanceOf(wallet1.address));
    assert.equal(200, await daiMockInteractor.balanceOf(wallet2.address));
    assert.equal(200, await daiMockInteractor.balanceOf(wallet3.address));
  });
  it('should withdraw less when pool decreases', async () => {
    const wallet1 = wallets[0];
    const wallet2 = wallets[1];
    const wallet3 = wallets[2];

    // Check pool negative returns
    await rouletteInteractor.addLiquidity(wallet1, 100);
    await rouletteInteractor.addLiquidity(wallet2, 100);
    await rouletteInteractor.addLiquidity(wallet3, 100);
    await rouletteInteractor.burnDai(60);
    assert.equal(240, await rouletteInteractor.getTotalLiquidity());
    await rouletteInteractor.removeLiquidity(wallet1);
    await rouletteInteractor.removeLiquidity(wallet2);
    await rouletteInteractor.removeLiquidity(wallet3);
    assert.equal(0, await rouletteInteractor.getTotalLiquidity());
    assert.equal(180, await daiMockInteractor.balanceOf(wallet1.address));
    assert.equal(180, await daiMockInteractor.balanceOf(wallet2.address));
    assert.equal(180, await daiMockInteractor.balanceOf(wallet3.address));
  });
  it('should manage equity with dynamic liquidity', async () => {
    const wallet1 = wallets[0];
    const wallet2 = wallets[1];
    const wallet3 = wallets[2];

    // Check pool negative returns
    await rouletteInteractor.addLiquidity(wallet1, 100);
    await rouletteInteractor.addLiquidity(wallet2, 100);
    await rouletteInteractor.addLiquidity(wallet3, 100);
    await rouletteInteractor.burnDai(12);
    assert.equal(288, await rouletteInteractor.getTotalLiquidity());
    await rouletteInteractor.removeLiquidity(wallet1);
    assert.equal(176, await daiMockInteractor.balanceOf(wallet1.address));
    assert.equal(288-96, await rouletteInteractor.getTotalLiquidity());
    await rouletteInteractor.mintDAI(100);
    assert.equal(288-96+100, await rouletteInteractor.getTotalLiquidity());
    await rouletteInteractor.removeLiquidity(wallet2);
    await rouletteInteractor.removeLiquidity(wallet3);
    assert.equal(226, await daiMockInteractor.balanceOf(wallet2.address));
    assert.equal(226, await daiMockInteractor.balanceOf(wallet3.address));
  });
});
