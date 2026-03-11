import { NextRequest, NextResponse } from "next/server";

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const UI_POOL_DATA = "0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d";
const POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
const ETH_PRICE_USD = 3000;

const ABI_getUserAccountData = "0x35ea6a75";
const ABI_balanceOf = "0x70a08231";

async function rpcCall(method: string, params: any[]) {
  const res = await fetch("https://ethereum.publicnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  return json.result;
}

function hexToInt(hex: string) {
  return parseInt(hex, 16);
}

function hexToBigInt(hex: string) {
  return BigInt(hex);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  console.log("API hit - wallet:", wallet);

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const positions: any[] = [];

  try {
    // Call getUserAccountData(address) on Aave Pool
    const paddedWallet = wallet.replace("0x", "").padStart(64, "0");
    const data = ABI_getUserAccountData + paddedWallet;

    const result = await rpcCall("eth_call", [
      { to: AAVE_POOL, data },
      "latest",
    ]);

    console.log("RPC result:", result);

    if (result && result !== "0x") {
      // Result is 6 x 32 bytes:
      // totalCollateralBase, totalDebtBase, availableBorrowsBase,
      // currentLiquidationThreshold, ltv, healthFactor
      const hex = result.replace("0x", "");
      const chunk = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));

      const totalCollateralBase = chunk(0); // in USD with 8 decimals
      const totalDebtBase = chunk(1);
      const liquidationThresholdRaw = chunk(3); // basis points
      const healthFactorRaw = chunk(5); // 1e18

      const collateralUSD = Number(totalCollateralBase) / 1e8;
      const debtUSD = Number(totalDebtBase) / 1e8;
      const liquidationThreshold = Number(liquidationThresholdRaw) / 10000;
      const healthFactor = Number(healthFactorRaw) / 1e18;

      console.log({ collateralUSD, debtUSD, liquidationThreshold, healthFactor });

      if (debtUSD > 0 && collateralUSD > 0) {
        positions.push({
          protocol: "Aave v3",
          healthFactor,
          collateralUSD: Math.round(collateralUSD),
          debtUSD: Math.round(debtUSD),
          liquidationPrice: 0,
          collateralAsset: "Mixed",
        });
      }
    }
  } catch (e) {
    console.error("Aave fetch error:", e);
  }

  return NextResponse.json({ positions });
}