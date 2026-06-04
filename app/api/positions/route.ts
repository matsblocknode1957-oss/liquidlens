import { NextRequest, NextResponse } from "next/server";

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const ETH_PRICE_USD = 3000;

const CHAINLINK_ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
const CHAINLINK_WBTC_USD = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b";

const COMPOUND_COMET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// Liquidation collateral factor for WETH in cUSDCv3
const COMPOUND_WETH_LIQ_CF = 0.825;

const ABI_getUserAccountData = "0xbf92857c";
const ABI_latestRoundData = "0xfeaf968c";
const ABI_borrowBalanceOf = "0x374c49b4";
const ABI_collateralBalanceOf = "0x5c2549ee";

function getRpcUrl() {
  return process.env.ALCHEMY_RPC_URL ?? "https://ethereum.publicnode.com";
}

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) {
    console.error("RPC error:", JSON.stringify(json.error), "params:", JSON.stringify(params));
  }
  return json.result;
}

interface ChainlinkPrices {
  ETH_USD?: number;
  WBTC_USD?: number;
}

async function fetchChainlinkPrice(feedAddress: string): Promise<number | null> {
  const result = await rpcCall("eth_call", [
    { to: feedAddress, data: ABI_latestRoundData },
    "latest",
  ]);

  if (!result || result === "0x") return null;

  const hex = result.replace("0x", "");
  // latestRoundData returns: roundId, answer, startedAt, updatedAt, answeredInRound
  // answer is at slot 1, with 8 decimals
  const answer = BigInt("0x" + hex.slice(64, 128));
  return Number(answer) / 1e8;
}

async function fetchChainlinkPrices(): Promise<ChainlinkPrices> {
  const [ethResult, wbtcResult] = await Promise.allSettled([
    fetchChainlinkPrice(CHAINLINK_ETH_USD),
    fetchChainlinkPrice(CHAINLINK_WBTC_USD),
  ]);

  const prices: ChainlinkPrices = {};

  if (ethResult.status === "fulfilled" && ethResult.value !== null) {
    prices.ETH_USD = ethResult.value;
  } else {
    console.error("Chainlink ETH/USD fetch failed:", ethResult.status === "rejected" ? ethResult.reason : "null result");
  }

  if (wbtcResult.status === "fulfilled" && wbtcResult.value !== null) {
    prices.WBTC_USD = wbtcResult.value;
  } else {
    console.error("Chainlink WBTC/USD fetch failed:", wbtcResult.status === "rejected" ? wbtcResult.reason : "null result");
  }

  return prices;
}

async function fetchAavePosition(wallet: string, prices: ChainlinkPrices): Promise<object | null> {
  const paddedWallet = wallet.replace("0x", "").padStart(64, "0");
  const result = await rpcCall("eth_call", [
    { to: AAVE_POOL, data: ABI_getUserAccountData + paddedWallet },
    "latest",
  ]);

  console.log("Aave RPC result:", result);

  if (!result || result === "0x") return null;

  const hex = result.replace("0x", "");
  const chunk = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));

  const collateralUSD = Number(chunk(0)) / 1e8;
  const debtUSD = Number(chunk(1)) / 1e8;
  const liquidationThreshold = Number(chunk(3)) / 10000;
  const healthFactor = Number(chunk(5)) / 1e18;

  if (debtUSD === 0 || collateralUSD === 0) return null;

  const ethPrice = prices.ETH_USD ?? ETH_PRICE_USD;
  const liquidationPrice = Math.round(
    (debtUSD / (collateralUSD * liquidationThreshold)) * ethPrice
  );

  return {
    protocol: "Aave v3",
    healthFactor,
    collateralUSD: Math.round(collateralUSD),
    debtUSD: Math.round(debtUSD),
    liquidationPrice,
    collateralAsset: "Mixed",
  };
}

async function fetchCompoundPosition(wallet: string, prices: ChainlinkPrices): Promise<object | null> {
  const paddedWallet = wallet.replace("0x", "").padStart(64, "0");
  const paddedWeth = WETH.replace("0x", "").padStart(64, "0");

  const [borrowResult, collateralResult] = await Promise.all([
    rpcCall("eth_call", [{ to: COMPOUND_COMET, data: ABI_borrowBalanceOf + paddedWallet }, "latest"]),
    rpcCall("eth_call", [{ to: COMPOUND_COMET, data: ABI_collateralBalanceOf + paddedWallet + paddedWeth }, "latest"]),
  ]);

  console.log("Compound raw borrowBalance:", borrowResult);
  console.log("Compound raw collateralBalance:", collateralResult);

  if (!borrowResult || borrowResult === "0x") return null;

  const debtUSD = Number(BigInt(borrowResult)) / 1e6;
  if (debtUSD === 0) return null;

  const wethBalance =
    collateralResult && collateralResult !== "0x"
      ? Number(BigInt(collateralResult)) / 1e18
      : 0;

  const ethPrice = prices.ETH_USD ?? ETH_PRICE_USD;
  const collateralUSD = wethBalance * ethPrice;
  const healthFactor = (collateralUSD * COMPOUND_WETH_LIQ_CF) / debtUSD;

  if (!isFinite(healthFactor) || isNaN(healthFactor) || healthFactor <= 0) return null;

  const liquidationPrice =
    wethBalance > 0
      ? Math.round(debtUSD / (wethBalance * COMPOUND_WETH_LIQ_CF))
      : 0;

  return {
    protocol: "Compound v3",
    healthFactor,
    collateralUSD: Math.round(collateralUSD),
    debtUSD: Math.round(debtUSD),
    liquidationPrice,
    collateralAsset: "WETH",
  };
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  console.log("API hit - wallet:", wallet);

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const [chainlinkPrices] = await Promise.allSettled([fetchChainlinkPrices()]);
  const prices: ChainlinkPrices =
    chainlinkPrices.status === "fulfilled" ? chainlinkPrices.value : {};

  const [aaveResult, compoundResult] = await Promise.allSettled([
    fetchAavePosition(wallet, prices),
    fetchCompoundPosition(wallet, prices),
  ]);

  const positions: object[] = [];

  if (aaveResult.status === "fulfilled" && aaveResult.value) {
    positions.push(aaveResult.value);
  } else if (aaveResult.status === "rejected") {
    console.error("Aave fetch error:", aaveResult.reason);
  }

  if (compoundResult.status === "fulfilled" && compoundResult.value) {
    positions.push(compoundResult.value);
  } else if (compoundResult.status === "rejected") {
    console.error("Compound fetch error:", compoundResult.reason);
  }

  return NextResponse.json({ positions, chainlinkPrices: prices });
}
