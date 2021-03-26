// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

enum BetType {
    Number,
    Color,
    Even,
    Column,
    Dozen,
    Half
}

enum Color {
    Green,
    Red,
    Black
}


contract Roulette is ERC20 {
    struct Bet {
        BetType betType;
        uint8 value;
        uint256 amount;
    }
    
    mapping (bytes32 => uint256[3][]) _rollRequestsBets;
    mapping (bytes32 => bool) _rollRequestsCompleted;
    mapping (bytes32 => address) _rollRequestsSender;

    uint256 public BASE_SHARES = uint256(10) ** 36;
    address public bet_token;

    mapping (uint8 => Color) COLORS;
    uint8[18] private RED_NUMBERS = [
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
    ];

    event BetResult(address from, uint256 randomResult, uint256 payout);

    constructor(address _bet_token) public ERC20("SAKURA_V1", "SV1") {
        bet_token = _bet_token;

        // Set up colors
        COLORS[0] = Color.Green;
        for (uint8 i = 1; i < 37; i++) {
            COLORS[i] = Color.Black;
        }
        for (uint8 i = 0; i < RED_NUMBERS.length; i++) {
            COLORS[RED_NUMBERS[i]] = Color.Red;
        }
    }
    
    function addLiquidity(uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) public {
        require(amount > 0, "You didn't send any balance");

        // Collect ERC-20 tokens
        collectToken(msg.sender, amount, deadline, v, r, s);

        uint256 added_liquidity = amount;
        uint256 current_liquidity = IERC20(bet_token).balanceOf(address(this)) - added_liquidity;

        if (current_liquidity <= 0) {
            _mint(msg.sender, BASE_SHARES * added_liquidity);
            return;
        }

        uint256 current_shares = totalSupply();
        uint256 new_shares = (added_liquidity * current_shares) / current_liquidity;
        
        _mint(msg.sender, new_shares);
    }
    
    function removeLiquidity() public payable {
        require(balanceOf(msg.sender) > 0, "Your don't have liquidity");

        uint256 current_liquidity = IERC20(bet_token).balanceOf(address(this));
        uint256 sender_shares = balanceOf(msg.sender);
        uint256 sender_liquidity = (sender_shares * current_liquidity) / totalSupply();

        _burn(msg.sender, sender_shares);
        IERC20(bet_token).transfer(msg.sender, sender_liquidity);
    }

    function rollBets(Bet[] memory bets, uint256 randomSeed, uint deadline, uint8 v, bytes32 r, bytes32 s) public {
        uint256 amount = 0;

        for (uint index = 0; index < bets.length; index++) {
            require(bets[index].value < 37);
            amount += bets[index].amount;
        }

        require(amount <= getMaxBet(), "Your bet exceeds the max allowed");

        collectToken(msg.sender, amount, deadline, v, r, s);

        // TODO: Use Chainlink VRF for retrieving requestId
        // bytes32 requestId = getRandomNumber(randomSeed);
        bytes32 requestId = s;
        
        _rollRequestsSender[requestId] = msg.sender;
        _rollRequestsCompleted[requestId] = false;
        for (uint i; i < bets.length; i++) {
            _rollRequestsBets[requestId].push([uint256(bets[i].betType), uint256(bets[i].value), uint256(bets[i].amount)]);
        }

        // TODO: remove this line and replace it with Chainlink VRF
        fulfillRandomness(requestId, randomSeed);
    }

    function getRandomNumber(uint256 userProvidedSeed) public view returns (bytes32 requestId) {
        // TODO: Use Chainlink VRF
        // require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        // return requestRandomness(keyHash, fee, userProvidedSeed);
        return bytes32(random(userProvidedSeed));
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal {
        require(_rollRequestsCompleted[requestId] == false);
        uint8 result = uint8(randomness % 37);
        uint256[3][] memory bets = _rollRequestsBets[requestId];

        uint256 amount = 0;
        for (uint index = 0; index < bets.length; index++) {
            BetType betType = BetType(bets[index][0]);
            uint8 betValue = uint8(bets[index][1]);
            uint256 betAmount = bets[index][2];

            if (betType == BetType.Number && result == betValue) {
                amount += betAmount * 36;
                continue;
            }
            if (result == 0) {
                continue;
            }
            if (betType == BetType.Color && uint8(COLORS[result]) == betValue) {
                emit BetResult(_rollRequestsSender[requestId], result, betValue);
                amount += betAmount * 2;
                continue;
            }
            if (betType == BetType.Even && result % 2 == betValue) {
                amount += betAmount * 2;
                continue;
            }
            if (betType == BetType.Column && result % 3 == betValue) {
                amount += betAmount * 3;
                continue;
            }
            if (betType == BetType.Dozen && betValue * 12 < result && result <= (betValue + 1) * 12) {
                amount += betAmount * 3;
                continue;
            }
            if (betType == BetType.Half && (betValue != 0 ? (result > 19) : (result <= 19))) {
                amount += betAmount * 2;
                continue;
            }
        }

        _rollRequestsCompleted[requestId] = true;
        if (amount > 0) {
            IERC20(bet_token).transfer(_rollRequestsSender[requestId], amount);
        }

        emit BetResult(_rollRequestsSender[requestId], result, amount);
    }
    
    function getMaxBet() public view returns(uint) {
        uint256 current_balance = IERC20(bet_token).balanceOf(address(this));
        return current_balance / 10;
    }

    function collectToken(address sender, uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) private {
        IERC20Permit(bet_token).permit(sender, address(this), amount, deadline, v, r, s);
        IERC20(bet_token).transferFrom(sender, address(this), amount);
    }

    // TODO: replace with Chainlink VRF
    function random(uint256 userProvidedSeed) private view returns(uint256) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            userProvidedSeed + block.timestamp + block.difficulty +
            ((uint256(keccak256(abi.encodePacked(block.coinbase)))) / (block.timestamp)) +
            block.gaslimit + 
            ((uint256(keccak256(abi.encodePacked(msg.sender)))) / (block.timestamp)) +
            block.number
        )));
        
        return (seed - ((seed / 1000) * 1000));
    }
}
