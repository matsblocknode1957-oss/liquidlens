import { NextRequest, NextResponse } from "next/server";

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const ETH_PRICE_USD = 3000;

const CHAINLINK_ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
const CHAINLINK_WBTC_USD = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b";

const COMPOUND_COMET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// Liquidation collateral factor for WETH in cUSDCv3
const COMPOUND_WETH_LIQ_CF = 0.825;

const MAKER_CDP_MANAGER = "0x5ef30b9986345249bc32d8928B7ee64DE9435E39";
const MAKER_GET_CDPS = "0x36a724Bd100c39f0Ea4D3A20F7097eE01a8fF573";
const MAKER_VAT = "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B";
const MAKER_PROXY_REGISTRY = "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4";

const ABI_getUserAccountData = "0xbf92857c";
const ABI_latestRoundData = "0xfeaf968c";
const ABI_borrowBalanceOf = "0x374c49b4";
const ABI_collateralBalanceOf = "0x5c2549ee";
const ABI_getCdpsAsc = "0x1ce03f38";
const ABI_vatUrns = "0x2424be5c";
const ABI_vatIlks = "0xd9638d36";
const ABI_proxies = "0xc4552791";

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

// Decode the (uint256[], address[], bytes32[]) tuple returned by getCdpsAsc.
// ABI-encodes dynamic arrays with 32-byte offset headers followed by length-prefixed data.
function decodeCdps(hex: string): Array<{ urn: string; ilk: string }> {
  const word = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));
  const wordNum = (i: number) => Number(word(i));

  // First three words are byte offsets into the data; divide by 32 for word indices.
  const off1 = wordNum(0) / 32; // ids array header
  const off2 = wordNum(1) / 32; // urns array header
  const off3 = wordNum(2) / 32; // ilks array header

  const len = wordNum(off1);
  const results = [];
  for (let i = 0; i < len; i++) {
    // Address is right-aligned in 32 bytes: last 40 hex chars of the word.
    const urnWord = off2 + 1 + i;
    const urn = "0x" + hex.slice(urnWord * 64 + 24, urnWord * 64 + 64);
    // bytes32 is left-aligned: full 64 hex chars.
    const ilkWord = off3 + 1 + i;
    const ilk = hex.slice(ilkWord * 64, ilkWord * 64 + 64);
    results.push({ urn, ilk });
  }
  return results;
}

// Convert a left-aligned bytes32 hex string to its ASCII label, e.g. "ETH-A".
function ilkToString(ilkHex: string): string {
  let str = "";
  for (let i = 0; i < ilkHex.length; i += 2) {
    const byte = parseInt(ilkHex.slice(i, i + 2), 16);
    if (byte === 0) break;
    str += String.fromCharCode(byte);
  }
  return str;
}

async function fetchMakerPosition(wallet: string, prices: ChainlinkPrices): Promise<object | null> {
  const paddedManager = MAKER_CDP_MANAGER.replace("0x", "").padStart(64, "0");
  const paddedWallet = wallet.replace("0x", "").padStart(64, "0");

  // CDPs are usually owned by the wallet's DSProxy, not the wallet itself.
  // Look up the proxy address from the ProxyRegistry, then try getCdpsAsc with
  // both the proxy and the wallet directly (some users open CDPs without a proxy).
  const proxyResult = await rpcCall("eth_call", [
    { to: MAKER_PROXY_REGISTRY, data: ABI_proxies + paddedWallet },
    "latest",
  ]);
  const proxyAddr =
    proxyResult && proxyResult !== "0x" && proxyResult !== "0x" + "0".repeat(64)
      ? "0x" + proxyResult.slice(-40)
      : null;
  const zeroAddr = "0x0000000000000000000000000000000000000000";
  const lookupAddrs = [...new Set([proxyAddr, wallet].filter((a): a is string => !!a && a !== zeroAddr))];

  let cdpsResult: string | null = null;
  for (const addr of lookupAddrs) {
    const paddedAddr = addr.replace("0x", "").padStart(64, "0");
    const result = await rpcCall("eth_call", [
      { to: MAKER_GET_CDPS, data: ABI_getCdpsAsc + paddedManager + paddedAddr },
      "latest",
    ]);
    if (result && result !== "0x" && result.length > 2) {
      cdpsResult = result;
      break;
    }
  }

  console.log("Maker getCdpsAsc result:", cdpsResult?.slice(0, 66));

  if (!cdpsResult || cdpsResult === "0x") return null;

  const hex = cdpsResult.replace("0x", "");
  const cdps = decodeCdps(hex).filter(c => ilkToString(c.ilk).startsWith("ETH"));
  if (cdps.length === 0) return null;

  const ethPrice = prices.ETH_USD ?? ETH_PRICE_USD;

  // Fetch Vat urn state + ilk data for all ETH CDPs in parallel.
  const resolved = await Promise.all(
    cdps.map(async cdp => {
      const paddedIlk = cdp.ilk; // already 64 hex chars (bytes32, left-aligned)
      const paddedUrn = cdp.urn.replace("0x", "").padStart(64, "0");

      const [urnResult, ilkResult] = await Promise.all([
        rpcCall("eth_call", [{ to: MAKER_VAT, data: ABI_vatUrns + paddedIlk + paddedUrn }, "latest"]),
        rpcCall("eth_call", [{ to: MAKER_VAT, data: ABI_vatIlks + paddedIlk }, "latest"]),
      ]);

      if (!urnResult || urnResult === "0x" || !ilkResult || ilkResult === "0x") return null;

      const urnHex = urnResult.replace("0x", "");
      const inkBig = BigInt("0x" + urnHex.slice(0, 64));   // collateral [wad]
      const artBig = BigInt("0x" + urnHex.slice(64, 128)); // normalised debt [wad]
      if (artBig === 0n) return null;

      const ilkDataHex = ilkResult.replace("0x", "");
      const rateBig = BigInt("0x" + ilkDataHex.slice(64, 128));  // [ray] stability fee accumulator
      const spotBig = BigInt("0x" + ilkDataHex.slice(128, 192)); // [ray] price / liquidation ratio

      const inkEth = Number(inkBig) / 1e18;
      const spotUsd = Number(spotBig) / 1e27;
      // Actual debt in DAI: art * rate / 1e27 (wad), then / 1e18 for plain units.
      const debtDai = Number(artBig * rateBig / (10n ** 27n)) / 1e18;

      if (debtDai === 0 || inkEth === 0 || spotUsd === 0) return null;

      // HF = (collateral_value / liq_ratio) / debt, which equals (ink * spot) / (art * rate).
      const healthFactor = (inkEth * spotUsd) / debtDai;
      // Derive liquidation ratio from current spot and ETH price, then compute liq price.
      const liqRatio = ethPrice / spotUsd;
      const liquidationPrice = Math.round(debtDai * liqRatio / inkEth);

      return {
        healthFactor,
        collateralUSD: Math.round(inkEth * ethPrice),
        debtUSD: Math.round(debtDai),
        liquidationPrice,
        collateralAsset: ilkToString(cdp.ilk),
      };
    })
  );

  const valid = resolved.filter((p): p is NonNullable<typeof p> => p !== null);
  if (valid.length === 0) return null;

  // Surface the most at-risk CDP (lowest health factor).
  const worst = valid.reduce((a, b) => a.healthFactor < b.healthFactor ? a : b);

  return {
    protocol: "MakerDAO",
    healthFactor: worst.healthFactor,
    collateralUSD: worst.collateralUSD,
    debtUSD: worst.debtUSD,
    liquidationPrice: worst.liquidationPrice,
    collateralAsset: worst.collateralAsset,
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

  const [aaveResult, compoundResult, makerResult] = await Promise.allSettled([
    fetchAavePosition(wallet, prices),
    fetchCompoundPosition(wallet, prices),
    fetchMakerPosition(wallet, prices),
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

  if (makerResult.status === "fulfilled" && makerResult.value) {
    positions.push(makerResult.value);
  } else if (makerResult.status === "rejected") {
    console.error("Maker fetch error:", makerResult.reason);
  }

  return NextResponse.json({ positions, chainlinkPrices: prices });
}
