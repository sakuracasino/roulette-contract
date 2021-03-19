// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMock is ERC20 {
    constructor (uint256 initialSupply) ERC20("DAI-MICK", "DAI") {
        _mint(msg.sender, initialSupply);
    }
 
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
 
    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
