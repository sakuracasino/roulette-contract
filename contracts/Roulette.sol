// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Roulette is ERC20 {

    mapping (address => uint256) public shares_of;
    uint256 public current_shares;
    
    event Bet(string, address, uint, uint, uint256);
    
    constructor() public ERC20("SAKURA_V1", "SV1") {
        _mint(msg.sender, 0);
    }
    
    function receive() public payable {}
    
    function addLiquidity() public payable {
        require(msg.value > 0, "You didn't send any balance");
        uint256 lx = msg.value;
        uint256 l = address(this).balance - lx;
        if (l <= 0) {
          uint256 base_shares = 10**36;
          _mint(msg.sender, base_shares * lx);
          return;
        }
        uint256 d = totalSupply();
        uint256 p = lx*d;
        uint256 dx = p / l;
        
        _mint(msg.sender, dx);
    }
    
    function removeLiquidity() public payable {
        require(balanceOf(msg.sender) > 0, "Your don't have liquidity");
        uint256 current_funds = address(this).balance;
        uint256 sender_balance = balanceOf(msg.sender);
        uint256 sender_liquidity = (sender_balance * current_funds) / totalSupply();
        payable(msg.sender).transfer(sender_liquidity);
        _burn(msg.sender, sender_balance);
    }
    
    // 0: black
    // 1: red
    // 2: green
    function betColor(uint color) public payable {
        require(msg.value <= getMaxBet(), "Your bet exceeds the max allowed");
        uint256 randomNumber = random() % 37;
        if ((randomNumber == 0 && color == 2) || (randomNumber % 2 == color)) {
            payable(msg.sender).transfer(msg.value * 2);
            emit Bet("WIN", address(msg.sender), msg.value, color, randomNumber);
            return;
        }
        emit Bet("LOSE", address(msg.sender), msg.value, color, randomNumber);
    }
    
    function getMaxBet() public view returns(uint) {
        uint256 current_balance = address(this).balance;
        return current_balance / 10;
    }

    // Temp random, replace with Chainlink VRF
    function random() private view returns(uint256) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp + block.difficulty +
            ((uint256(keccak256(abi.encodePacked(block.coinbase)))) / (block.timestamp)) +
            block.gaslimit + 
            ((uint256(keccak256(abi.encodePacked(msg.sender)))) / (block.timestamp)) +
            block.number
        )));
        
        return (seed - ((seed / 1000) * 1000));
    }
}
