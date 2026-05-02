# LiquidLens — DeFi Liquidation Risk Monitor Powered by Chainlink

**Version 1.0 — May 2026**

---

## 1. What is LiquidLens

LiquidLens is a real-time DeFi liquidation risk monitoring platform. It tracks wallet health factors across Aave and Compound, alerts users before their positions reach the liquidation threshold, and logs risk events permanently on-chain using Chainlink Automation.

DeFi borrowers supply collateral and take on debt. If the value of that collateral falls — or the value of the borrowed asset rises — their health factor drops. When it hits 1.0, anyone can liquidate their position, seizing collateral at a discount. Most users only find out when it is too late.

LiquidLens watches continuously. Users connect their wallet, set a health factor alert threshold, and receive email notifications the moment their position enters the danger zone.

---

## 2. The Problem

DeFi liquidation risk is one of the most financially destructive forces in the ecosystem — and one of the least visible to ordinary users.

In April 2026, the KelpDAO hack triggered over **$5 billion in capital flight from Aave** in a single event. The protocol's total value locked collapsed as users scrambled to unwind positions, and cascading liquidations followed. Borrowers with no monitoring in place had no warning. Positions built over months were wiped out in hours.

This is not an isolated incident. Since 2020, billions of dollars in collateral have been liquidated across major DeFi protocols. The pattern is consistent: asset prices move sharply, health factors collapse faster than users can react, and liquidators extract value before borrowers can respond.

The core failure is informational. The data is on-chain and public, but it is not surfaced in a way that gives users actionable, real-time notice. Block explorers are not alerts. Protocol dashboards are not monitoring systems.

The $290M KelpDAO exploit and the chaos that followed illustrate exactly why passive observation is not enough. Users need active surveillance of their risk exposure — not a post-mortem.

---

## 3. The Solution

LiquidLens closes the gap between on-chain risk and user awareness.

**Real-time health factor monitoring.** LiquidLens polls wallet health factors across Aave and Compound continuously. Users set their own alert threshold — for example, triggering a warning when their health factor drops below 1.5.

**Instant email alerts.** When a monitored wallet crosses the user-defined threshold, LiquidLens sends an email alert immediately. The notification includes the current health factor, the protocol at risk, and a direct link to the position.

**On-chain risk logging.** Risk events are not just stored in a database — they are logged permanently on the blockchain via the `LiquidLensRiskLogger` smart contract, triggered by Chainlink Automation. This creates a tamper-proof, auditable record of every risk event.

**Freemium model.** Basic monitoring is free. Advanced features — including multi-wallet tracking and lower polling intervals — are available via a paid tier powered by Stripe.

The goal is simple: give DeFi users the same kind of risk alerting that TradFi traders have had for decades, built on decentralised infrastructure.

---

## 4. Chainlink Integration

LiquidLens uses Chainlink at two critical layers of the stack.

### Price Feeds

Asset valuations in DeFi are only as reliable as the price data behind them. LiquidLens integrates Chainlink's battle-tested decentralised oracle network to fetch verified, manipulation-resistant prices for:

- **ETH/USD** — `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`
- **WBTC/USD** — `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`

These feeds are aggregated from dozens of independent data providers, updated on a heartbeat and deviation basis, and secured by Chainlink's decentralised node operator network. Using them means LiquidLens health factor calculations reflect the same verified prices the DeFi protocols themselves rely on.

### Chainlink Automation

On-chain risk logging is triggered by **Chainlink Automation** — a decentralised keeper network that executes smart contract functions on a defined schedule without requiring a centralised server to initiate transactions.

The `LiquidLensRiskLogger` contract implements the `AutomationCompatibleInterface`. Chainlink Automation calls `checkUpkeep` on a regular cadence; if monitored wallets have breached their health factor threshold, it calls `performUpkeep`, which logs the risk event on-chain permanently.

This architecture means the monitoring layer is not dependent on LiquidLens infrastructure remaining online. Chainlink Automation provides a decentralised, censorship-resistant trigger.

---

## 5. Smart Contract

**Contract:** `LiquidLensRiskLogger`
**Network:** Ethereum Sepolia Testnet
**Address:** `0x6381383Ff70434A7681Bc329D89b3a7AC17129A8`

The contract implements:

- `checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)` — called off-chain by Chainlink Automation nodes to determine whether any monitored wallet has a health factor below threshold.
- `performUpkeep(bytes calldata performData) external` — called on-chain when upkeep is needed; logs a `RiskEvent` to contract storage and emits a `RiskEventLogged` event.

### Key Data Structures

```solidity
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
```

Risk events are stored permanently in the `riskEvents` array and queryable by index or wallet address. The contract integrates directly with the Aave V3 pool (`0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`) to read live health factors via `getUserAccountData`.

The owner can add and remove monitored wallets. Any logged risk event is immutable once written.

---

## 6. Product

**Live at [liquidlens.uk](https://liquidlens.uk)**

LiquidLens is a working product, not a whitepaper promise.

| Feature | Free | Pro |
|---|---|---|
| Wallet health factor monitoring | 1 wallet | Multiple wallets |
| Email alerts | ✓ | ✓ |
| On-chain risk log | ✓ | ✓ |
| Chainlink price feeds | ✓ | ✓ |
| Lower polling frequency | — | ✓ |

**Payments** are handled via Stripe. Users can upgrade to Pro from within the dashboard.

**Alerts** are delivered by email as soon as a health factor crosses the user-defined threshold. The email includes the wallet address, current health factor, protocol, and severity level.

**Supported protocols:** Aave V3 (Ethereum Mainnet), Compound (planned).

---

## 7. Traction

- **Live product** deployed and accessible at liquidlens.uk
- **Chainlink Automation** registered and active on Ethereum Sepolia testnet, triggering `LiquidLensRiskLogger` on monitored wallet health checks
- **Chainlink Price Feeds** integrated for ETH/USD and WBTC/USD valuations in the frontend dashboard
- **Stripe payments** integrated for Pro tier upgrades
- **Smart contract** deployed and verified on Sepolia: `0x6381383Ff70434A7681Bc329D89b3a7AC17129A8`

LiquidLens was built in response to real liquidation events, is deployed on real infrastructure, and is actively monitored.

---

## 8. Links

| | |
|---|---|
| **Product** | [liquidlens.uk](https://liquidlens.uk) |
| **GitHub** | [github.com/matthewboyle/liquidlens](https://github.com/matthewboyle/liquidlens) |
| **Smart Contract** | [Sepolia Etherscan — 0x6381383Ff70434A7681Bc329D89b3a7AC17129A8](https://sepolia.etherscan.io/address/0x6381383Ff70434A7681Bc329D89b3a7AC17129A8) |
| **Contact** | matsblocknode1957@gmail.com |

---

*LiquidLens is built on Chainlink. Chainlink is the industry-standard decentralised oracle network powering verifiable data and automation for the Web3 economy.*
