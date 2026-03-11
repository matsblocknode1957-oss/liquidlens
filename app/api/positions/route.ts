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
        collateralReserve: reserves(where: { currentATokenBalance_gt: "0" }) {
          currentATokenBalance
          reserve {
            symbol
            decimals
            reserveLiquidationThreshold
            price { priceInEth }
          }
        }
        borrowReserve: reserves(where: { currentTotalDebt_gt: "0" }) {
          currentTotalDebt
          reserve {
            symbol
            decimals
            price { priceInEth }
          }
        }
      }
    }`;

    const res = await fetch(
      `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/HB1Z2EAw4rtPRYVb2Nz8QGFLHCpym6ByBX6vbCViuE9F`,
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
      const ETH_PRICE = 3000;
      let collateralUSD = 0;
      let collateralAsset = "Unknown";
      let collateralPriceEth = 1;

      user.collateralReserve?.forEach((r: any) => {
        const balance = parseFloat(r.currentATokenBalance) / Math.pow(10, r.reserve.decimals);
        const priceEth = parseFloat(r.reserve.price.priceInEth) / 1e18;
        collateralUSD += balance * priceEth * ETH_PRICE;
        collateralAsset = r.reserve.symbol;
        collateralPriceEth = priceEth;
      });

      let debtUSD = 0;
      user.borrowReserve?.forEach((r: any) => {
        const debt = parseFloat(r.currentTotalDebt) / Math.pow(10, r.reserve.decimals);
        const priceEth = parseFloat(r.reserve.price.priceInEth) / 1e18;
        debtUSD += debt * priceEth * ETH_PRICE;
      });

      if (collateralUSD > 0 && debtUSD > 0) {
        const liquidationThreshold = user.collateralReserve?.[0]
          ? parseFloat(user.collateralReserve[0].reserve.reserveLiquidationThreshold) / 10000
          : 0.8;

        const hf = (collateralUSD * liquidationThreshold) / debtUSD;
        const collateralAmount = collateralUSD / (collateralPriceEth * ETH_PRICE);
        const liquidationPrice = debtUSD / (collateralAmount * liquidationThreshold);

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