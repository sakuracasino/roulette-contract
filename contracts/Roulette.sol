// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Roulette is ERC20 {
    address public bet_token;

    event Bet(string, address, uint, uint, uint256);
    
    constructor(address _bet_token) public ERC20("SAKURA_V1", "SV1") {
        _mint(msg.sender, 0);
        bet_token = _bet_token;
    }
    
    function receive() public payable {}
    
    function addLiquidity(uint256 amount) public payable {
        IERC20(bet_token).transferFrom(msg.sender, address(this), amount);
        require(amount > 0, "You didn't send any balance");
        uint256 lx = amount;
        uint256 l = IERC20(bet_token).balanceOf(address(this)) - lx;
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
        uint256 current_funds = IERC20(bet_token).balanceOf(address(this));
        uint256 sender_balance = balanceOf(msg.sender);
        uint256 sender_liquidity = (sender_balance * current_funds) / totalSupply();
        _burn(msg.sender, sender_balance);
        IERC20(bet_token).transfer(msg.sender, sender_liquidity);
    }
    
    // 0: black
    // 1: red
    // 2: green
    function betColor(uint color, uint256 amount) public payable {
        IERC20(bet_token).transferFrom(msg.sender, address(this), amount);
        require(amount <= getMaxBet(), "Your bet exceeds the max allowed");
        uint256 randomNumber = random() % 37;
        if ((randomNumber == 0 && color == 2) || (randomNumber % 2 == color)) {
            IERC20(bet_token).transfer(msg.sender, amount * 2);
            emit Bet("WIN", address(msg.sender), msg.value, color, randomNumber);
            return;
        }
        emit Bet("LOSE", address(msg.sender), msg.value, color, randomNumber);
    }
    
    function getMaxBet() public view returns(uint) {
        uint256 current_balance = IERC20(bet_token).balanceOf(address(this));
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
