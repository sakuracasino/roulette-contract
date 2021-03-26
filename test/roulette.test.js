const wallets = require('./libs/wallets');
const rouletteInteractor = require('./libs/rouletteInteractor');
const daiMockInteractor = require('./libs/daiMockInteractor');
const { before } = require('lodash');

const BetType = {
  'Number': 0,
  'Color': 1,
  'Even': 2,
  'Column': 3,
  'Dozen': 4,
  'Half': 5,
};

const Color = {
  'Green': 0,
  'Red': 1,
  'Black': 2,
};

const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
];

function betFor(betType, wallet) {
  return async function (value, result, amount = 1) {
    await rouletteInteractor.rollBets(wallet, [
      {
        betType,
        value,
        amount,
      }
    ], result);
  }
}

contract('Roulette', async () => {
  describe('with liquidity', async () => {
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
  describe('with single bets', async () => {
    const wallet = wallets[4];
    it('should setup initial DAI', async () => {
      await rouletteInteractor.mintDAI(1000);
      await daiMockInteractor.mint(wallet.address, 100);
    })
    describe('when betting color', async () => {
      const betColor = betFor(BetType.Color, wallet);

      it('should lose if outcome is not of bet color', async () => {
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        await betColor(Color.Red, 2, 2); // 2 is black
        assert.equal(98, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1002, await rouletteInteractor.getTotalLiquidity());

        await betColor(Color.Black, 18, 2); // 18 is red
        assert.equal(96, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1004, await rouletteInteractor.getTotalLiquidity());
      });
      it('should lose if outcome is zero', async () => {
        await betColor(Color.Black, 0, 2);
        assert.equal(94, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1006, await rouletteInteractor.getTotalLiquidity());

        await betColor(Color.Red, 0, 2);
        assert.equal(92, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1008, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet color', async () => {
        await betColor(Color.Black, 2, 8);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
    describe('when betting column', async () => {
      const betColumn = betFor(BetType.Column, wallet);

      it('should lose if outcome is not of bet column', async () => {
        await betColumn(0, 1);
        await betColumn(0, 4);
        await betColumn(0, 5);
        await betColumn(0, 31);
        await betColumn(0, 32);
        await betColumn(1, 0);
        await betColumn(1, 3);
        await betColumn(1, 5);
        await betColumn(1, 30);
        await betColumn(1, 32);
        await betColumn(2, 0);
        await betColumn(2, 3);
        await betColumn(2, 4);
        await betColumn(2, 30);
        await betColumn(2, 31);
        assert.equal(85, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1015, await rouletteInteractor.getTotalLiquidity());
      });
      it('should lose if outcome is zero', async () => {
        await betColumn(0, 0);
        await betColumn(1, 0);
        await betColumn(2, 0);
        assert.equal(82, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1018, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet column', async () => {
        await betColumn(0, 12, 1);
        assert.equal(84, await daiMockInteractor.balanceOf(wallet.address));
        await betColumn(1, 31, 4);
        await betColumn(2, 5, 4);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
    describe('when betting half', async () => {
      const betHalf = betFor(BetType.Half, wallet);

      it('should lose if outcome is not of bet half', async () => {
        await betHalf(0, 20);
        await betHalf(0, 24);
        await betHalf(0, 32);
        await betHalf(1, 4);
        await betHalf(1, 10);
        await betHalf(1, 19);
        assert.equal(94, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1006, await rouletteInteractor.getTotalLiquidity());
      });
      it('should lose if outcome is zero', async () => {
        await betHalf(0, 0);
        await betHalf(1, 0);
        assert.equal(92, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1008, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet half', async () => {
        await betHalf(0, 4, 4);
        assert.equal(96, await daiMockInteractor.balanceOf(wallet.address));
        await betHalf(1, 20, 4);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
    describe('when betting dozen', async () => {
      const betDozen = betFor(BetType.Dozen, wallet);
      it('should lose if outcome is not of bet dozen', async () => {
        await betDozen(0, 20);
        await betDozen(0, 24);
        await betDozen(1, 32);
        await betDozen(1, 4);
        await betDozen(2, 3);
        await betDozen(2, 19);
        assert.equal(94, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1006, await rouletteInteractor.getTotalLiquidity());
      });
      it('should lose if outcome is zero', async () => {
        await betDozen(0, 0);
        await betDozen(1, 0);
        await betDozen(2, 0);
        assert.equal(91, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1009, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet dozen', async () => {
        await betDozen(0, 5, 2);
        await betDozen(1, 21, 2);
        await betDozen(2, 31);
        await betDozen(2, 1);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
    describe('when betting parity', async () => {
      const betEven = betFor(BetType.Even, wallet);

      it('should lose if outcome is not of bet parity', async () => {
        await betEven(0, 11);
        await betEven(0, 3);
        await betEven(1, 32);
        await betEven(1, 4);
        assert.equal(96, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1004, await rouletteInteractor.getTotalLiquidity());
      });
      it('should lose if outcome is zero', async () => {
        await betEven(0, 0);
        await betEven(1, 0);
        assert.equal(94, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1006, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet parity', async () => {
        await betEven(0, 32, 3);
        assert.equal(97, await daiMockInteractor.balanceOf(wallet.address));
        await betEven(1, 15, 3);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
    describe('when betting number', async () => {
      const betNumber = betFor(BetType.Number, wallet);

      it('should lose if outcome is not of bet number', async () => {
        await betNumber(0, 11, 10);
        await betNumber(4, 3, 10);
        await betNumber(12, 32, 10);
        await betNumber(32, 4, 10);
        assert.equal(60, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1040, await rouletteInteractor.getTotalLiquidity());
      });
      it('should win if outcome is the bet number', async () => {
        await betNumber(0, 0);
        assert.equal(95, await daiMockInteractor.balanceOf(wallet.address));
        await betNumber(14, 14);
        assert.equal(130, await daiMockInteractor.balanceOf(wallet.address));
        await betNumber(14, 13, 30);
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        assert.equal(1000, await rouletteInteractor.getTotalLiquidity());
      });
    });
  });
  describe('with mixed bets', async () => {
    const wallet = wallets[4];
    describe('with predefined set #1', async () => {
      it('should return expected win', async () => {
        const bets = [
          {
            betType: BetType.Color,
            value: Color.Red,
            amount: 3,
          },
          {
            betType: BetType.Half,
            value: 0,
            amount: 4,
          },
        ];
        await rouletteInteractor.rollBets(wallet, bets, 0); // LOSE
        assert.equal(93, await daiMockInteractor.balanceOf(wallet.address));
        await rouletteInteractor.rollBets(wallet, bets, 1); // +7
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
        await rouletteInteractor.rollBets(wallet, bets, 11); // +1
        assert.equal(101, await daiMockInteractor.balanceOf(wallet.address));
        await rouletteInteractor.rollBets(wallet, bets, 25); // -1
        assert.equal(100, await daiMockInteractor.balanceOf(wallet.address));
      });
    });
    describe('with predefined set #2', async () => {
      it('should return expected win', async () => {

      });
    });
    describe('with random sets', async () => {
      it('should return expected win', async () => {

      });
    });
  });
});
