// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// checkUpkeep is declared view here (more restrictive than Chainlink's external-only
// interface) because it only reads state and is always called off-chain as a simulation.
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

interface IAavePool {
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

contract LiquidLensRiskLogger is AutomationCompatibleInterface {

    address public owner;
    address public constant AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;

    // ── Structs ───────────────────────────────────────────────────────────────

    struct RiskEvent {
        address wallet;
        uint256 healthFactor; // value * 1e18
        string protocol;
        uint256 timestamp;
        string severity;
    }

    struct MonitoredWallet {
        address wallet;
        uint256 threshold; // health factor threshold, 1e18 scale (e.g. 1.5e18)
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    RiskEvent[] private riskEvents;
    MonitoredWallet[] private monitoredWallets;

    // wallet address => index+1 in monitoredWallets; 0 means not present
    mapping(address => uint256) private walletIndexPlusOne;

    // ── Events ────────────────────────────────────────────────────────────────

    event RiskEventLogged(
        address indexed wallet,
        uint256 healthFactor,
        string protocol,
        uint256 timestamp,
        string severity
    );

    event WalletAdded(address indexed wallet, uint256 threshold);
    event WalletRemoved(address indexed wallet);

    // ── Access control ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Wallet management ─────────────────────────────────────────────────────

    function addWallet(address wallet, uint256 threshold) external onlyOwner {
        require(walletIndexPlusOne[wallet] == 0, "Already monitored");
        require(threshold > 0, "Zero threshold");
        monitoredWallets.push(MonitoredWallet(wallet, threshold));
        walletIndexPlusOne[wallet] = monitoredWallets.length; // length == new index + 1
        emit WalletAdded(wallet, threshold);
    }

    function removeWallet(address wallet) external onlyOwner {
        uint256 idxPlusOne = walletIndexPlusOne[wallet];
        require(idxPlusOne != 0, "Not monitored");

        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = monitoredWallets.length - 1;

        // Swap with last element so we can pop in O(1)
        if (idx != lastIdx) {
            MonitoredWallet memory last = monitoredWallets[lastIdx];
            monitoredWallets[idx] = last;
            walletIndexPlusOne[last.wallet] = idx + 1;
        }

        monitoredWallets.pop();
        delete walletIndexPlusOne[wallet];
        emit WalletRemoved(wallet);
    }

    function getMonitoredWallets() external view returns (MonitoredWallet[] memory) {
        return monitoredWallets;
    }

    // ── Chainlink Automation ──────────────────────────────────────────────────

    /// @notice Called off-chain by Chainlink nodes every block. Queries Aave v3
    ///         for each monitored wallet and returns at-risk wallets in performData.
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 len = monitoredWallets.length;

        // Allocate max-size arrays; resize via assembly before returning
        address[] memory atRiskWallets = new address[](len);
        uint256[] memory atRiskHealthFactors = new uint256[](len);
        uint256 count = 0;

        IAavePool aave = IAavePool(AAVE_POOL);

        for (uint256 i = 0; i < len; i++) {
            MonitoredWallet memory mw = monitoredWallets[i];

            try aave.getUserAccountData(mw.wallet) returns (
                uint256 /* totalCollateralBase */,
                uint256 totalDebtBase,
                uint256 /* availableBorrowsBase */,
                uint256 /* currentLiquidationThreshold */,
                uint256 /* ltv */,
                uint256 healthFactor
            ) {
                if (totalDebtBase > 0 && healthFactor < mw.threshold) {
                    atRiskWallets[count] = mw.wallet;
                    atRiskHealthFactors[count] = healthFactor;
                    count++;
                }
            } catch {}
        }

        if (count > 0) {
            // Shrink memory arrays to the actual number of at-risk wallets
            assembly {
                mstore(atRiskWallets, count)
                mstore(atRiskHealthFactors, count)
            }
            upkeepNeeded = true;
            performData = abi.encode(atRiskWallets, atRiskHealthFactors);
        }
    }

    /// @notice Called on-chain by the Chainlink Automation network when
    ///         checkUpkeep returns upkeepNeeded = true.
    function performUpkeep(bytes calldata performData) external override {
        (address[] memory wallets, uint256[] memory healthFactors) =
            abi.decode(performData, (address[], uint256[]));

        require(wallets.length == healthFactors.length, "Length mismatch");

        for (uint256 i = 0; i < wallets.length; i++) {
            // HF < 1.2e18 is critical; below threshold but >= 1.2e18 is a warning
            string memory severity = healthFactors[i] < 1.2e18 ? "critical" : "warning";
            _logRiskEvent(wallets[i], healthFactors[i], "Aave v3", severity);
        }
    }

    // ── Risk event logging ────────────────────────────────────────────────────

    /// @notice Manual log entry callable by the owner directly.
    function logRiskEvent(
        address wallet,
        uint256 healthFactor,
        string calldata protocol,
        string calldata severity
    ) external onlyOwner {
        _logRiskEvent(wallet, healthFactor, protocol, severity);
    }

    function _logRiskEvent(
        address wallet,
        uint256 healthFactor,
        string memory protocol,
        string memory severity
    ) internal {
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
