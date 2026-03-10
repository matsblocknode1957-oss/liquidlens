import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  console.log("API hit - wallet:", wallet);

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const positions: any[] = [];

  try {
    const query = `{
      user(id: "${wallet}") {
        id
        healthFactor
        totalCollateralUSD
        totalDebtUSD
        reserves(where: { currentATokenBalance_gt: "0" }) {
          currentATokenBalance
          currentTotalDebt
          reserve {
            symbol
            decimals
            reserveLiquidationThreshold
            underlyingAsset
          }
        }
      }
    }`;

    const res = await fetch(
      `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }
    );

    const json = await res.json();
    console.log("Aave response:", JSON.stringify(json));

    if (json?.errors) {
      console.error("Subgraph errors:", json.errors);
    }

    const user = json?.data?.user;

    if (user && user.healthFactor && user.healthFactor !== "0") {
      const hf = parseFloat(user.healthFactor) / 1e18;
      const collateralUSD = parseFloat(user.totalCollateralUSD || "0");
      const debtUSD = parseFloat(user.totalDebtUSD || "0");

      const liquidationThreshold = user.reserves?.[0]
        ? parseFloat(user.reserves[0].reserve.reserveLiquidationThreshold) / 10000
        : 0.8;

      const liquidationPrice = collateralUSD > 0 && debtUSD > 0
        ? (debtUSD / (liquidationThreshold * collateralUSD)) * 3000
        : 0;

      const collateralAsset = user.reserves?.[0]?.reserve?.symbol ?? "Unknown";

      positions.push({
        protocol: "Aave v3",
        healthFactor: hf,
        collateralUSD: Math.round(collateralUSD),
        debtUSD: Math.round(debtUSD),
        liquidationPrice: Math.round(liquidationPrice),
        collateralAsset,
      });
    }
  } catch (e) {
    console.error("Aave fetch error:", e);
  }

  return NextResponse.json({ positions });
}
