// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

contract Roulette {

  mapping (address => uint256) public shares_of;
  uint256 public current_shares;
  
  event Bet(string, address, uint, uint, uint256);
  
  function receive() public payable {}

  function addLiquidity() public payable {
    require(msg.value > 0, "Your didn't send a balance");
    uint256 lx = msg.value;
    uint256 l = address(this).balance - lx;
    if (l <= 0) {
      uint256 base_shares = 10**36;
      current_shares = base_shares * lx;
      shares_of[msg.sender] = base_shares * lx;
      return;
    }
    uint256 d = current_shares;
    uint256 p = lx*d;
    uint256 dx = p / l;

    shares_of[msg.sender] += dx;
    current_shares += dx;
  }

  function removeLiquidity() public payable {
    require(shares_of[msg.sender] > 0, "Your don't have liquidity");
    uint256 current_balance = address(this).balance;
    uint256 senderShares = shares_of[msg.sender];
    uint256 senderLiquidity = (senderShares * current_balance) / current_shares;
    msg.sender.transfer(senderLiquidity);
    current_shares -= senderShares;
    shares_of[msg.sender] = 0;
  }

  function betColor(uint color) public payable {
    require(msg.value <= getMaxBet(), "Your bet exceeds the max allowed");
    uint256 randomNumber = random() % 37;
    if ((randomNumber == 0 && color == 2) || (randomNumber % 2 == color)) {
      msg.sender.transfer(msg.value * 2);
      emit Bet("WIN", address(msg.sender), msg.value, color, randomNumber);
      return;
    }
    emit Bet("LOSE", address(msg.sender), msg.value, color, randomNumber);
  }

  function getMaxBet() public view returns(uint) {
    uint256 currentBalance = address(this).balance;
    return currentBalance / 10;
  }

  function getCurrentShares() public view returns(uint) {
    return current_shares;
  }

  function getSharesOf(address _address) public view returns(uint) {
    return shares_of[_address];
  }

  function random() private view returns(uint256) {
    uint256 seed = uint256(keccak256(abi.encodePacked(
        block.timestamp + block.difficulty +
        ((uint256(keccak256(abi.encodePacked(block.coinbase)))) / (now)) +
        block.gaslimit + 
        ((uint256(keccak256(abi.encodePacked(msg.sender)))) / (now)) +
        block.number
    )));

    return (seed - ((seed / 1000) * 1000));
    }
}
