
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  console.log("API hit - wallet:", wallet);

  if (!wallet) {
    return NextResponse.json({ error: "No wallet provided" }, { status: 400 });
  }

  const positions: any[] = [];

  try {
    const res = await fetch(
      `https://aave-api-v2.aave.com/data/users/${wallet}`,
      { headers: { "Content-Type": "application/json" } }
    );

    const json = await res.json();
    console.log("Aave response:", JSON.stringify(json).slice(0, 500));

    const v3 = json?.v3?.find((m: any) => m.chainId === 1);

    if (v3 && parseFloat(v3.healthFactor) > 0) {
      positions.push({
        protocol: "Aave v3",
        healthFactor: parseFloat(v3.healthFactor),
        collateralUSD: Math.round(parseFloat(v3.totalCollateralUSD || "0")),
        debtUSD: Math.round(parseFloat(v3.totalBorrowsUSD || "0")),
        liquidationPrice: 0,
        collateralAsset: v3.userReserves?.[0]?.reserve?.symbol ?? "Unknown",
      });
    }
  } catch (e) {
    console.error("Aave fetch error:", e);
  }

  return NextResponse.json({ positions });
}