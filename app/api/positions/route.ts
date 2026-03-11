
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
        borrowedReservesCount
        collateralReserve: reserves(where: { currentATokenBalance_gt: "0" }) {
          currentATokenBalance
          reserve {
            symbol
            decimals
            baseLTVasCollateral
            reserveLiquidationThreshold
            priceInUSD
          }
        }
        borrowReserve: reserves(where: { currentTotalDebt_gt: "0" }) {
          currentTotalDebt
          reserve {
            symbol
            decimals
            priceInUSD
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

    if (user) {
      let collateralUSD = 0;
      let collateralAsset = "Unknown";

      user.collateralReserve?.forEach((r: any) => {
        const balance = parseFloat(r.currentATokenBalance) / Math.pow(10, r.reserve.decimals);
        const priceUSD = parseFloat(r.reserve.priceInUSD || "0");
        collateralUSD += balance * priceUSD;
        collateralAsset = r.reserve.symbol;
      });

      let debtUSD = 0;
      user.borrowReserve?.forEach((r: any) => {
        const debt = parseFloat(r.currentTotalDebt) / Math.pow(10, r.reserve.decimals);
        const priceUSD = parseFloat(r.reserve.priceInUSD || "0");
        debtUSD += debt * priceUSD;
      });

      if (collateralUSD > 0 && debtUSD > 0) {
        const liquidationThreshold = user.collateralReserve?.[0]
          ? parseFloat(user.collateralReserve[0].reserve.reserveLiquidationThreshold) / 10000
          : 0.8;

        const hf = (collateralUSD * liquidationThreshold) / debtUSD;
        const liquidationPrice = debtUSD / (liquidationThreshold * (collateralUSD / (parseFloat(user.collateralReserve?.[0]?.reserve?.priceInUSD || "1"))));

        positions.push({
          protocol: "Aave v3",
          healthFactor: hf,
          collateralUSD: Math.round(collateralUSD),
          debtUSD: Math.round(debtUSD),
          liquidationPrice: Math.round(liquidationPrice),
          collateralAsset,
        });
      }
    }
  } catch (e) {
    console.error("Aave fetch error:", e);
  }

  return NextResponse.json({ positions });
}