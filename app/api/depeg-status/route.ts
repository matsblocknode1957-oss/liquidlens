import { NextResponse } from "next/server";

const COINS = ["FRAX", "USDC", "USDT", "DAI"];

export async function GET() {
  const settled = await Promise.allSettled(
    COINS.map((coin) =>
      fetch(`https://pegcheck.uk/api/depeg-status?coin=${coin}`, {
        next: { revalidate: 60 },
      }).then((r) => r.json())
    )
  );

  const alerts = settled
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d) => d.signal === "HEDGE" || d.signal === "EXIT");

  return NextResponse.json(alerts);
}
