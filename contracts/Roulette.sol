// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBase.sol";

interface DAIPermit {
    function permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) external;
}

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
/**
 * @title Sakura casino roulette
 */
contract Roulette is VRFConsumerBase, ERC20, Ownable {
    struct Bet {
        BetType betType;
        uint8 value;
        uint256 amount;
    }
    
    mapping (bytes32 => uint256[3][]) _rollRequestsBets;
    mapping (bytes32 => bool) _rollRequestsCompleted;
    mapping (bytes32 => address) _rollRequestsSender;
    mapping (bytes32 => uint8) _rollRequestsResults;
    mapping (bytes32 => uint256) _rollRequestsTime;

    uint256 BASE_SHARES = uint256(10) ** 18;
    uint256 public current_liquidity = 0;
    uint256 public locked_liquidity = 0;
    uint256 public collected_fees = 0;
    address public bet_token;
    uint256 public max_bet;
    uint256 public bet_fee;
    uint256 public redeem_min_time = 2 hours;

    // Minimum required liquidity for betting 1 token
    // uint256 public minLiquidityMultiplier = 36 * 10;
    uint256 public minLiquidityMultiplier = 100;
    
    // Constant value to represent an invalid result
    uint8 public constant INVALID_RESULT = 99;

    mapping (uint8 => Color) COLORS;
    uint8[18] private RED_NUMBERS = [
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
    ];

    event BetRequest(bytes32 requestId, address sender);
    event BetResult(bytes32 requestId, uint256 randomResult, uint256 payout);

    // Chainlink VRF Data
    bytes32 internal keyHash;
    uint256 internal fee;
    event RequestedRandomness(bytes32 requestId);

    /**
     * Contract's constructor
     * @param _bet_token address of the token used for bets and liquidity
     * @param _vrfCoordinator address of Chainlink's VRFCoordinator contract
     * @param _link address of the LINK token
     * @param _keyHash public key of Chainlink's VRF
     * @param _fee fee to be paid in LINK to Chainlink's VRF
     */
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
        bet_fee = 0;

        // Set up colors
        COLORS[0] = Color.Green;
        for (uint8 i = 1; i < 37; i++) {
            COLORS[i] = Color.Black;
        }
        for (uint8 i = 0; i < RED_NUMBERS.length; i++) {
            COLORS[RED_NUMBERS[i]] = Color.Red;
        }
    }

    /**
     * Add liquidity to the pool
     * @param amount amount of liquidity to be added
     * @param nonce nouce index of permit function
     * @param expiry expiry date for the permit function
     * @param allowed indicate "allowed" for the permit function
     * @param v signature param for the permit function
     * @param r signature param for the permit function
     * @param s signature param for the permit function
     */
    function addLiquidity(uint256 amount, uint256 nonce, uint expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) public {
        require(amount > 0, "You didn't send any balance");

        // Collect ERC-20 tokens
        collectToken(msg.sender, amount, nonce, expiry, allowed, v, r, s);

        uint256 added_liquidity = amount;
        uint256 current_shares = totalSupply();

        if (current_shares <= 0) {
            current_liquidity += added_liquidity;
            _mint(msg.sender, BASE_SHARES * added_liquidity);
            return;
        }

        uint256 new_shares = (added_liquidity * current_shares) / (current_liquidity + locked_liquidity);
        current_liquidity += added_liquidity;

        _mint(msg.sender, new_shares);
    }

    /**
     * Add liquidity to the pool: ONLY FOR ERC20 TOKENS WITHOUT PERMIT FUNCTION
     * @param amount amount of liquidity to be added
     */
    function addLiquidity(uint256 amount) public {
        addLiquidity(amount, 0, 0, false, 0, 0, 0);
    }

    /**
     * Remove liquidity from the pool
     */
    function removeLiquidity() external {
        require(balanceOf(msg.sender) > 0, "Your don't have liquidity");

        uint256 sender_shares = balanceOf(msg.sender);
        uint256 sender_liquidity = (sender_shares * current_liquidity) / totalSupply();

        current_liquidity -= sender_liquidity;
        _burn(msg.sender, sender_shares);
        IERC20(bet_token).transfer(msg.sender, sender_liquidity);
    }

    /**
     * Roll bets
     * @param bets list of bets to be played
     * @param randomSeed random number seed for the VRF
     * @param nonce nouce index of permit function
     * @param expiry expiry date for the permit function
     * @param allowed indicate "allowed" for the permit function
     * @param v signature param for the permit function
     * @param r signature param for the permit function
     * @param s signature param for the permit function
     */
    function rollBets(Bet[] memory bets, uint256 randomSeed, uint256 nonce, uint expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) public {
        uint256 amount = 0;

        for (uint index = 0; index < bets.length; index++) {
            require(bets[index].value < 37);
            amount += bets[index].amount;
        }

        require(amount <= getMaxBet(), "Your bet exceeds the max allowed");

        // Collect ERC-20 tokens
        collectToken(msg.sender, amount + bet_fee, nonce, expiry, allowed, v, r, s);
        current_liquidity -= amount * 35;
        locked_liquidity += amount * 36;
        collected_fees += bet_fee;

        bytes32 requestId = getRandomNumber(randomSeed);
        emit BetRequest(requestId, msg.sender);
        
        _rollRequestsSender[requestId] = msg.sender;
        _rollRequestsCompleted[requestId] = false;
        _rollRequestsTime[requestId] = block.timestamp;
        for (uint i; i < bets.length; i++) {
            _rollRequestsBets[requestId].push([uint256(bets[i].betType), uint256(bets[i].value), uint256(bets[i].amount)]);
        }
    }

    /**
     * Roll bets: ONLY FOR ERC20 TOKENS WITHOUT PERMIT FUNCTION
     * @param bets list of bets to be played
     * @param randomSeed random number seed for the VRF
     */
    function rollBets(Bet[] memory bets, uint256 randomSeed) public {
        rollBets(bets, randomSeed, 0, 0, false, 0, 0, 0);
    }

    /**
     * Creates a randomness request for Chainlink VRF
     * @param userProvidedSeed random number seed for the VRF
     * @return requestId id of the created randomness request
     */
    function getRandomNumber(uint256 userProvidedSeed) private returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        bytes32 _requestId = requestRandomness(keyHash, fee, userProvidedSeed);
        emit RequestedRandomness(_requestId);
        return _requestId;
    }

    /**
     * Randomness fulfillment to be called by the VRF Coordinator once a request is resolved
     * This function makes the expected payout to the user
     * @param requestId id of the resolved request
     * @param randomness generated random number
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        require(_rollRequestsCompleted[requestId] == false);
        uint8 result = uint8(randomness % 37);
        uint256[3][] memory bets = _rollRequestsBets[requestId];
        uint256 rollLockedAmount = getRollRequestAmount(requestId) * 36;

        current_liquidity += rollLockedAmount;
        locked_liquidity -= rollLockedAmount;

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
            current_liquidity -= amount;
        }

        emit BetResult(requestId, result, amount);
    }

    /**
     * Pays back the roll amount to the user if more than two hours passed and the random request has not been resolved yet
     * @param requestId id of random request
     */
    function redeem(bytes32 requestId) external {
        require(_rollRequestsCompleted[requestId] == false, 'requestId already completed');
        require(block.timestamp - _rollRequestsTime[requestId] > redeem_min_time, 'Redeem time not passed');

        _rollRequestsCompleted[requestId] = true;
        _rollRequestsResults[requestId] = INVALID_RESULT;

        uint256 amount = getRollRequestAmount(requestId);

        current_liquidity += amount * 35;
        locked_liquidity -= amount * 36;

        IERC20(bet_token).transfer(_rollRequestsSender[requestId], amount);

        emit BetResult(requestId, _rollRequestsResults[requestId], amount);
    }

    /**
     * Returns the roll amount of a request
     * @param requestId id of random request
     * @return amount of the roll of the request
     */
    function getRollRequestAmount(bytes32 requestId) internal view returns(uint256) {
        uint256[3][] memory bets = _rollRequestsBets[requestId];
        uint256 amount = 0;

        for (uint index = 0; index < bets.length; index++) {
            uint256 betAmount = bets[index][2];
            amount += betAmount;
        }

        return amount;
    }

    /**
     * Collects the requested token amount from a sender
     * @param sender address of the sender
     * @param amount amount of the token to be collected
     * @param nonce nouce index of permit function, unused if non-permit token
     * @param expiry expiry date for the permit function, 0 if non-permit token
     * @param allowed indicate "allowed" for the permit function, unused if non-permit token
     * @param v signature param for the permit function, unused if non-permit token
     * @param r signature param for the permit function, unused if non-permit token
     * @param s signature param for the permit function, unused if non-permit token
     */
    function collectToken(address sender, uint256 amount, uint256 nonce, uint expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) private {
        if (expiry != 0) {
            DAIPermit(bet_token).permit(sender, address(this), nonce, expiry, allowed, v, r, s);
        }

        IERC20(bet_token).transferFrom(sender, address(this), amount);
    }

    /**
     * Returns a request state
     * @param requestId id of random request
     * @return indicates if request is completed
     */
    function isRequestCompleted(bytes32 requestId) public view returns(bool) {
        return _rollRequestsCompleted[requestId];
    }

    /**
     * Returns the address of a request
     * @param requestId id of random request
     * @return address of the request sender
     */
    function requesterOf(bytes32 requestId) public view returns(address) {
        return _rollRequestsSender[requestId];
    }

    /**
     * Returns the result of a request
     * @param requestId id of random request
     * @return numeric result of the request in range [0, 38], 99 means invalid result from a redeem
     */
    function resultOf(bytes32 requestId) public view returns(uint8) {
        return _rollRequestsResults[requestId];
    }

    /**
     * Returns all the bet details in a request
     * @param requestId id of random request
     * @return a list of (betType, value, amount) tuplets from the request
     */
    function betsOf(bytes32 requestId) public view returns(uint256[3][] memory) {
        return _rollRequestsBets[requestId];
    }

    /**
     * Returns the current pooled liquidity
     * @return the current liquidity
     */
    function getCurrentLiquidity() public view returns(uint256) {
        return current_liquidity;
    }

    /**
     * Returns the current bet fee
     * @return the bet fee
     */
    function getBetFee() public view returns(uint256) {
        return bet_fee;
    }

    /**
     * Returns the current maximum fee
     * @return the maximum bet
     */
    function getMaxBet() public view returns(uint256) {
        uint256 maxBetForLiquidity = current_liquidity / minLiquidityMultiplier;
        if (max_bet > maxBetForLiquidity) {
            return maxBetForLiquidity;
        }
        return max_bet;
    }

    /**
     * Returns the collected fees so far
     * @return the collected fees
     */
    function getCollectedFees() public view returns(uint256) {
        return collected_fees;
    }
    
    /**
     * Sets the bet fee
     * @param _bet_fee the new bet fee
     */
    function setBetFee(uint256 _bet_fee) external onlyOwner {
        bet_fee = _bet_fee;
    }

    /**
     * Sets the maximum bet
     * @param _max_bet the new maximum bet
     */
    function setMaxBet(uint256 _max_bet) external onlyOwner {
        max_bet = _max_bet;
    }

    /**
     * Sets minimum liquidity needed for betting 1 token
     * @param _minLiquidityMultiplier the new minimum liquidity multiplier
     */
    function setMinLiquidityMultiplier(uint256 _minLiquidityMultiplier) external onlyOwner {
        minLiquidityMultiplier = _minLiquidityMultiplier;
    }

    /**
     * Withdraws the collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 _collected_fees = collected_fees;
        collected_fees = 0;
        IERC20(bet_token).transfer(owner(), _collected_fees);
    }

    /**
     * Sets the value of Chainlink's VRF fee
     */
    function setVRFFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }
}
