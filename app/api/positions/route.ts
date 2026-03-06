import { NextRequest, NextResponse } from "next/server";

const AAVE_SUBGRAPH = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_GRAPH_API_KEY}/subgraphs/id/0x87b2fe4b8947aacf1b5d1e91e93a29dba4a02c9e`;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const positions: any[] = [];

  try {
    const aaveRes = await fetch(AAVE_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          user(id: "${wallet}") {
            borrowedReservesCount
            healthFactor
            reserves {
              currentATokenBalance
              currentTotalDebt
              reserve {
                symbol
                price { priceInEth }
                liquidationThreshold
              }
            }
          }
        }`
      }),
    });

    const aaveData = await aaveRes.json();
    const user = aaveData?.data?.user;

    if (user && parseFloat(user.healthFactor) > 0) {
      const collateralReserve = user.reserves?.find((r: any) => parseFloat(r.currentATokenBalance) > 0);
      const debtReserve = user.reserves?.find((r: any) => parseFloat(r.currentTotalDebt) > 0);

      const collateralUSD = collateralReserve
        ? parseFloat(collateralReserve.currentATokenBalance) * parseFloat(collateralReserve.reserve.price.priceInEth) * 3000
        : 0;

      const debtUSD = debtReserve
        ? parseFloat(debtReserve.currentTotalDebt) * parseFloat(debtReserve.reserve.price.priceInEth) * 3000
        : 0;

      const hf = parseFloat(user.healthFactor) / 1e18;
      const liquidationThreshold = collateralReserve ? parseFloat(collateralReserve.reserve.liquidationThreshold) / 10000 : 0.8;
      const liquidationPrice = debtUSD > 0 ? (debtUSD / (collateralUSD * liquidationThreshold)) : 0;

      positions.push({
        protocol: "Aave v3",
        healthFactor: hf,
        collateralUSD: Math.round(collateralUSD),
        debtUSD: Math.round(debtUSD),
        liquidationPrice: Math.round(liquidationPrice),
        collateralAsset: collateralReserve?.reserve?.symbol || "Unknown",
      });
    }
  } catch (e) {
    console.error("Aave fetch error:", e);
  }

  return NextResponse.json({ positions });
}