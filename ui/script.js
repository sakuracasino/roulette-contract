var contractAddress = '0x839355b443a7cf34d2ddcc5fb5a50b6e0894d3c8'; // ROPSTEN CONTRACT ADDRESS
window.addEventListener('load', async () => {
  document.getElementById('contract-link').setAttribute(
    'href',
    `https://ropsten.etherscan.io/address/${contractAddress}`
  )

  function enableLoading() {
    document.getElementById('loader-container').setAttribute('style', 'display:block');
  }
  function disableLoading() {
    document.getElementById('loader-container').setAttribute('style', 'display:none');
  }
  // Modern dapp browsers...
  if (window.ethereum) {
      window.web3 = new Web3(ethereum);
      try {
          enableLoading();
          await ethereum.enable();
          var accounts = await web3.eth.getAccounts();
          var accountAddress = accounts[0];
          var RouletteContract = new web3.eth.Contract(abi, contractAddress);
          
          const refreshBalance = async function () {
            const maxBetWei = await RouletteContract.methods.getMaxBet().call();
            const maxBet = web3.utils.fromWei(`${maxBetWei}`, 'ether');
            const currentShares = await RouletteContract.methods.getCurrentShares().call();
            const sharesOfLogged = await RouletteContract.methods.getSharesOf(accountAddress).call();
            const contractBalance = await web3.eth.getBalance(contractAddress);
            const _balance = await web3.eth.getBalance(accountAddress);
            try {
              const liquidity = contractBalance * (sharesOfLogged / currentShares);
              const ethAtStake = liquidity ? web3.utils.fromWei(`${liquidity}`, 'ether') : 0;
              const balance = _balance ? web3.utils.fromWei(`${_balance}`, 'ether') : 0;  
              document.getElementById('current-liquidity').innerHTML = `${ethAtStake} ETH`;  
              document.getElementById('current-balance').innerHTML = `${balance} ETH`;
              document.getElementById('max-bet').innerHTML = `(Max. ${maxBet} ETH)`;
            } catch(e) {
              console.log(e);
            }
          };

          const refreshBets = async function () {
            const bets = await RouletteContract.getPastEvents('Bet', {
              filter: {1: accountAddress},
              fromBlock: 0,
              toBlock: 'latest',
            });
            const betTableBody = document.createElement('tbody');
            bets.reverse().forEach(bet => {
              const betElement = document.createElement('tr');
              betElement.className = 'bet';
              const status = document.createElement('td');
              status.className = bet.returnValues[0] == 'WIN' ? 'bet-status-win' : 'bet-status-lose';
              status.innerHTML = bet.returnValues[0];
              const thrown = document.createElement('td');
              thrown.className = 'bet-thrown';
              thrown.innerHTML = bet.returnValues[4];
              const color = document.createElement('td');
              color.className = 'bet-color';
              switch (bet.returnValues[3]) {
                case '0':
                  color.innerHTML = 'black';
                  break;
                case '1':
                  color.innerHTML = 'red';
                  break;
                case '2':
                  color.innerHTML = 'green';
                  break;
              }
              const amount = document.createElement('td');
              amount.className = 'bet-amount';
              amount.innerHTML = web3.utils.fromWei(bet.returnValues[2], 'ether') + ` eth`;

              betElement.appendChild(status);
              betElement.appendChild(thrown);
              betElement.appendChild(color);
              betElement.appendChild(amount);
              betTableBody.appendChild(betElement);
            });
            const betTable = document.getElementById('bet-table');
            betTable.removeChild(betTable.children[1]);
            betTable.appendChild(betTableBody);
          };

          await refreshBalance();
          await refreshBets();
          disableLoading();

          document.getElementById('liquidity-add-button').addEventListener('click', async function () {
            const toAdd = document.getElementById('liquidity-add-input').value;
            document.getElementById('liquidity-add-input').value = '';
            if(isNaN(Number(toAdd))) {
              alert('Liquidity is not a number');
              return;
            }
            enableLoading();
            await RouletteContract.methods.addLiquidity().send({from: accountAddress, value: web3.utils.toWei(toAdd, 'ether')});
            await refreshBalance();
            disableLoading();
            alert(`Added liquidity of ${toAdd} ETH`)
          });
          document.getElementById('liquidity-remove-button').addEventListener('click', async function () {
            enableLoading();
            await RouletteContract.methods.removeLiquidity().send({from: accountAddress});
            await refreshBalance();
            disableLoading();
            alert(`Removed your liquidity`);
          });
          document.getElementById('place-bet').addEventListener('click', async function () {
            const betAmount = document.getElementById('bet-amount').value;
            const color = document.getElementById('bet-color').value;
            const maxBetWei = await RouletteContract.methods.getMaxBet().call();
            const maxBet = web3.utils.fromWei(`${maxBetWei}`, 'ether');
            document.getElementById('bet-amount').value = '';
            if(isNaN(Number(maxBet))) {
              alert('Amount is not a number');
              return;
            }
            if(Number(betAmount) > Number(maxBet)) {
              alert(`Max bet is ${maxBet} ETH and you want to bet ${betAmount} ETH`);
              return;
            }
            enableLoading();
            const apiResult = await RouletteContract.methods.betColor(color).send({from: accountAddress, value: web3.utils.toWei(betAmount, 'ether')});
            const result = {
              status: apiResult.events.Bet.returnValues[0],
              thrown: apiResult.events.Bet.returnValues[4],
            };
            alert(`You ${result.status}, the number thrown is ${result.thrown}`);
            await refreshBalance();
            await refreshBets();
            disableLoading();
          });
      } catch (error) {
          // User denied account access...
          disableLoading();
          alert('An error occurred, check the console');
          console.error(error);
      }
  }
  // Non-dapp browsers...
  else {
      alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
      console.error('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
});