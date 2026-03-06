import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const positions: any[] = [];

  try {
    const query = `{
      user(id: "${wallet}") {
        id
        borrowedReservesCount
        collateralReserve: reserves(where: { currentATokenBalance_gt: "0" }) {
          currentATokenBalance
          reserve {
            symbol
            decimals
            baseLTVasCollateral
            reserveLiquidationThreshold
            price {
              priceInEth
            }
          }
        }
        borrowReserve: reserves(where: { currentTotalDebt_gt: "0" }) {
          currentTotalDebt
          reserve {
            symbol
            decimals
            price {
              priceInEth
            }
          }
        }
        healthFactor
      }
    }`;

    const res = await fetch(
      `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_GRAPH_API_KEY}/subgraphs/id/Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL57s`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }
    );

    const json = await res.json();
    console.log("Aave response:", JSON.stringify(json));

    const user = json?.data?.user;

    if (user && user.healthFactor && user.healthFactor !== "0") {
      const hf = parseFloat(user.healthFactor) / 1e18;

      let collateralUSD = 0;
      let collateralAsset = "Unknown";
      user.collateralReserve?.forEach((r: any) => {
        const balance = parseFloat(r.currentATokenBalance) / Math.pow(10, r.reserve.decimals);
        const priceEth = parseFloat(r.reserve.price.priceInEth) / 1e18;
        collateralUSD += balance * priceEth * 3000;
        collateralAsset = r.reserve.symbol;
      });

      let debtUSD = 0;
      user.borrowReserve?.forEach((r: any) => {
        const debt = parseFloat(r.currentTotalDebt) / Math.pow(10, r.reserve.decimals);
        const priceEth = parseFloat(r.reserve.price.priceInEth) / 1e18;
        debtUSD += debt * priceEth * 3000;
      });

      const liquidationThreshold = user.collateralReserve?.[0]
        ? parseFloat(user.collateralReserve[0].reserve.reserveLiquidationThreshold) / 10000
        : 0.8;

      const liquidationPrice = collateralUSD > 0 && debtUSD > 0
        ? debtUSD / (collateralUSD / 3000 * liquidationThreshold)
        : 0;

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