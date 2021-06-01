// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBase.sol";

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

contract Roulette is VRFConsumerBase, ERC20 {
    struct Bet {
        BetType betType;
        uint8 value;
        uint256 amount;
    }
    
    mapping (bytes32 => uint256[3][]) _rollRequestsBets;
    mapping (bytes32 => bool) _rollRequestsCompleted;
    mapping (bytes32 => address) _rollRequestsSender;
    mapping (bytes32 => uint8) _rollRequestsResults;

    uint256 public BASE_SHARES = uint256(10) ** 36;
    address public bet_token;
    uint256 public max_bet;

    mapping (uint8 => Color) COLORS;
    uint8[18] private RED_NUMBERS = [
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
    ];

    event BetRequest(bytes32 requestId, address sender);
    event BetResult(bytes32 requestId, uint256 randomResult, uint256 payout);

    // Chainlink VRF Data
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public randomResult;
    event RequestedRandomness(bytes32 requestId);

    constructor(
        address _bet_token,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint _fee
    )  ERC20("SAKURA_V1", "SV1") VRFConsumerBase(_vrfCoordinator, _link) public {
        keyHash = _keyHash;
        fee = _fee; 
        bet_token = _bet_token;
        max_bet = 10**20;

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
        uint256 current_shares = totalSupply();

        if (current_shares <= 0) {
            _mint(msg.sender, BASE_SHARES * added_liquidity);
            return;
        }

        uint256 new_shares = added_liquidity * (current_shares / current_liquidity);
        
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

        bytes32 requestId = getRandomNumber(randomSeed);
        emit BetRequest(requestId, msg.sender);
        
        _rollRequestsSender[requestId] = msg.sender;
        _rollRequestsCompleted[requestId] = false;
        for (uint i; i < bets.length; i++) {
            _rollRequestsBets[requestId].push([uint256(bets[i].betType), uint256(bets[i].value), uint256(bets[i].amount)]);
        }
    }

    function getRandomNumber(uint256 userProvidedSeed) public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        bytes32 _requestId = requestRandomness(keyHash, fee, userProvidedSeed);
        emit RequestedRandomness(_requestId);
        return _requestId;
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
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

        _rollRequestsResults[requestId] = result;
        _rollRequestsCompleted[requestId] = true;
        if (amount > 0) {
            IERC20(bet_token).transfer(_rollRequestsSender[requestId], amount);
        }

        emit BetResult(requestId, result, amount);
    }
    
    function getMaxBet() public view returns(uint256) {
        return max_bet;
    }

    function collectToken(address sender, uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) private {
        IERC20Permit(bet_token).permit(sender, address(this), amount, deadline, v, r, s);
        IERC20(bet_token).transferFrom(sender, address(this), amount);
    }

    function isRequestCompleted(bytes32 requestId) public view returns(bool) {
        return _rollRequestsCompleted[requestId];
    }

    function requesterOf(bytes32 requestId) public view returns(address) {
        return _rollRequestsSender[requestId];
    }

    function resultOf(bytes32 requestId) public view returns(uint8) {
        return _rollRequestsResults[requestId];
    }

    function betsOf(bytes32 requestId) public view returns(uint256[3][] memory) {
        return _rollRequestsBets[requestId];
    }
    
    /**
     * Withdraw LINK from this contract
     * 
     * DO NOT USE THIS IN PRODUCTION AS IT CAN BE CALLED BY ANY ADDRESS.
     * THIS IS PURELY FOR EXAMPLE PURPOSES.
     */
    function withdrawLink() external {
        require(LINK.transfer(msg.sender, LINK.balanceOf(address(this))), "Unable to transfer");
    }
}
