// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SignalBond
 * @notice USDC-backed accountability market for AI trading signals on Arc Chain.
 *         Uses native USDC (Arc's native currency) — no ERC-20 approve needed.
 *         AI agents stake USDC behind every signal. Users buy or challenge signals.
 *         Settlement distributes native USDC based on market outcomes.
 */
contract SignalBond is Ownable {

    uint256 public constant SLASH_RATE = 20;        // 20%
    uint256 public constant BUYER_SHARE = 50;       // 50% of slash
    uint256 public constant CHALLENGER_SHARE = 40;  // 40% of slash
    uint256 public constant PROTOCOL_SHARE = 10;    // 10% of slash

    enum SignalStatus { OPEN, SETTLED_WIN, SETTLED_LOSE, SETTLED_EXPIRED, CANCELLED }

    struct Signal {
        address agent;
        uint256 bondAmount;
        uint256 accessFee;
        uint256 totalAccessFees;
        uint256 totalChallengeAmount;
        uint256 buyerCount;
        uint256 challengerCount;
        SignalStatus status;
    }

    mapping(bytes32 => Signal) public signals;
    mapping(bytes32 => mapping(address => bool)) public purchases;
    mapping(bytes32 => address[]) public buyers;
    mapping(bytes32 => mapping(address => uint256)) public challenges;
    mapping(bytes32 => address[]) public challengers;

    address public protocolTreasury;

    event SignalCreated(bytes32 indexed signalId, address indexed agent, uint256 bondAmount, uint256 accessFee);
    event SignalPurchased(bytes32 indexed signalId, address indexed buyer, uint256 amount);
    event SignalChallenged(bytes32 indexed signalId, address indexed challenger, uint256 amount);
    event SignalSettled(bytes32 indexed signalId, SignalStatus result, uint256 slashAmount);

    constructor(address _treasury) Ownable(msg.sender) {
        protocolTreasury = _treasury;
    }

    /// @notice Agent creates a signal — send native USDC as bond via msg.value
    function createSignal(
        bytes32 signalId,
        uint256 accessFee
    ) external payable {
        require(signals[signalId].agent == address(0), "Signal exists");
        require(msg.value > 0, "Bond required");

        signals[signalId] = Signal({
            agent: msg.sender,
            bondAmount: msg.value,
            accessFee: accessFee,
            totalAccessFees: 0,
            totalChallengeAmount: 0,
            buyerCount: 0,
            challengerCount: 0,
            status: SignalStatus.OPEN
        });

        emit SignalCreated(signalId, msg.sender, msg.value, accessFee);
    }

    /// @notice User buys a signal — send accessFee as msg.value
    function buySignal(bytes32 signalId) external payable {
        Signal storage s = signals[signalId];
        require(s.agent != address(0), "Signal not found");
        require(s.status == SignalStatus.OPEN, "Signal not open");
        require(!purchases[signalId][msg.sender], "Already purchased");
        require(msg.value >= s.accessFee, "Insufficient fee");

        purchases[signalId][msg.sender] = true;
        buyers[signalId].push(msg.sender);
        s.totalAccessFees += msg.value;
        s.buyerCount++;

        emit SignalPurchased(signalId, msg.sender, msg.value);
    }

    /// @notice User challenges a signal — send challenge stake as msg.value
    function challengeSignal(bytes32 signalId) external payable {
        Signal storage s = signals[signalId];
        require(s.agent != address(0), "Signal not found");
        require(s.status == SignalStatus.OPEN, "Signal not open");
        require(msg.value > 0, "Amount required");

        if (challenges[signalId][msg.sender] == 0) {
            challengers[signalId].push(msg.sender);
            s.challengerCount++;
        }
        challenges[signalId][msg.sender] += msg.value;
        s.totalChallengeAmount += msg.value;

        emit SignalChallenged(signalId, msg.sender, msg.value);
    }

    /// @notice Owner settles signal based on market outcome
    /// @param result: 1 = WIN (TP hit), 2 = LOSE (SL hit), 3 = EXPIRED
    function settleSignal(bytes32 signalId, uint8 result) external onlyOwner {
        Signal storage s = signals[signalId];
        require(s.status == SignalStatus.OPEN, "Already settled");
        require(result >= 1 && result <= 3, "Invalid result");

        if (result == 1) {
            // WIN: agent gets bond + access fees + challenge stakes
            s.status = SignalStatus.SETTLED_WIN;
            uint256 agentPayout = s.bondAmount + s.totalAccessFees + s.totalChallengeAmount;
            _send(s.agent, agentPayout);

        } else if (result == 2) {
            // LOSE: slash agent bond, refund buyers, reward challengers
            s.status = SignalStatus.SETTLED_LOSE;
            uint256 slashAmount = (s.bondAmount * SLASH_RATE) / 100;
            uint256 buyerPool = (slashAmount * BUYER_SHARE) / 100;
            uint256 challengerPool = (slashAmount * CHALLENGER_SHARE) / 100;
            uint256 protocolFee = (slashAmount * PROTOCOL_SHARE) / 100;

            // Agent gets bond minus slash
            _send(s.agent, s.bondAmount - slashAmount);

            // Refund access fees + compensation to buyers
            if (s.buyerCount > 0) {
                uint256 perBuyer = (s.totalAccessFees + buyerPool) / s.buyerCount;
                for (uint256 i = 0; i < buyers[signalId].length; i++) {
                    _send(buyers[signalId][i], perBuyer);
                }
            }

            // Reward challengers proportionally
            if (s.challengerCount > 0) {
                for (uint256 i = 0; i < challengers[signalId].length; i++) {
                    address c = challengers[signalId][i];
                    uint256 stake = challenges[signalId][c];
                    uint256 reward = (challengerPool * stake) / s.totalChallengeAmount;
                    _send(c, stake + reward);
                }
            }

            // Protocol fee
            _send(protocolTreasury, protocolFee);

        } else {
            // EXPIRED: return bond, partial refund access fees, return challenges
            s.status = SignalStatus.SETTLED_EXPIRED;

            // Agent gets bond + 50% access fees
            _send(s.agent, s.bondAmount + (s.totalAccessFees / 2));

            // Refund 50% access fees to buyers
            if (s.buyerCount > 0) {
                uint256 perBuyer = (s.totalAccessFees / 2) / s.buyerCount;
                for (uint256 i = 0; i < buyers[signalId].length; i++) {
                    _send(buyers[signalId][i], perBuyer);
                }
            }

            // Return challenge stakes
            for (uint256 i = 0; i < challengers[signalId].length; i++) {
                address c = challengers[signalId][i];
                _send(c, challenges[signalId][c]);
            }
        }

        emit SignalSettled(signalId, s.status, result == 2 ? (s.bondAmount * SLASH_RATE) / 100 : 0);
    }

    /// @dev Send native USDC safely
    function _send(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /// @dev Allow contract to receive native USDC
    receive() external payable {}
}
