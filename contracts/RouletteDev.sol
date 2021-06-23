// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./Roulette.sol";

/* This contract is intended for testing */
contract RouletteDev is Roulette {
  constructor(
        address _bet_token,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint _fee
    ) Roulette(_bet_token, _vrfCoordinator, _link, _keyHash, _fee) public {}

    /**
     * Modfies current liquidity intentionally
     * DO NOT USE IN PRODUCTION,
     * IT IS INTENDED FOR TESTING
     */
    function forceAddLiquidity(uint256 amount) external {
        current_liquidity += amount;
    }
    function forceRemoveLiquidity(uint256 amount) external {
        current_liquidity -= amount;
        bet_token.call(abi.encodeWithSignature("burn(address,uint)", address(this), amount));
    }

    /**
     * Withdraw LINK from this contract
     * 
     * DO NOT USE THIS IN PRODUCTION AS IT CAN BE CALLED BY ANY ADDRESS.
     * THIS IS PURELY FOR EXAMPLE PURPOSES.
     */
    function withdrawLink() external onlyOwner {
        require(LINK.transfer(msg.sender, LINK.balanceOf(address(this))), "Unable to transfer");
    }
}