// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LiquidLensRiskLogger {
    address public owner;

    struct RiskEvent {
        address wallet;
        uint256 healthFactor; // value * 1e18
        string protocol;
        uint256 timestamp;
        string severity;
    }

    RiskEvent[] private riskEvents;

    event RiskEventLogged(
        address indexed wallet,
        uint256 healthFactor,
        string protocol,
        uint256 timestamp,
        string severity
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function logRiskEvent(
        address wallet,
        uint256 healthFactor,
        string calldata protocol,
        string calldata severity
    ) external onlyOwner {
        riskEvents.push(RiskEvent({
            wallet: wallet,
            healthFactor: healthFactor,
            protocol: protocol,
            timestamp: block.timestamp,
            severity: severity
        }));
        emit RiskEventLogged(wallet, healthFactor, protocol, block.timestamp, severity);
    }

    function getRiskEvents() external view returns (RiskEvent[] memory) {
        return riskEvents;
    }

    function getRiskEventCount() external view returns (uint256) {
        return riskEvents.length;
    }
}
