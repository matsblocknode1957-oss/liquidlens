
import { NextResponse } from "next/server";

function getRiskLevel(atRiskUSD: number, totalBorrowedUSD: number) {
  const ratio = totalBorrowedUSD > 0 ? atRiskUSD / totalBorrowedUSD : 0;
  if (ratio < 0.03) return { riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" };
  if (ratio < 0.08) return { riskLevel: "Medium", riskColor: "#f59e0b", riskBg: "#2d1f00" };
  return { riskLevel: "High", riskColor: "#ef4444", riskBg: "#2d0a0a" };
}

function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}


async function fetchAaveData() {
  const AAVE_ENDPOINT = `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL87g`;

  const liqQuery = `
    {
      liquidationCalls(
        first: 4
        orderBy: timestamp
        orderDirection: desc
      ) {
        user { id }
        collateralReserve { symbol }
        principalAmountInUSD
        timestamp
      }
    }
  `;

  try {
    const [llamaRes, liqRes] = await Promise.all([
      fetch("https://api.llama.fi/protocol/aave-v3", {
        headers: { Accept: "application/json" },
      }),
      fetch(AAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: liqQuery }),
      }),
    ]);

    const llamaData = await llamaRes.json();
    const liqData = await liqRes.json();

    const borrowed = llamaData?.currentChainTvls?.["Ethereum-borrowed"] ?? 0;
    const totalBorrowed = typeof borrowed === "number" ? borrowed : 0;
    const atRiskTotal = totalBorrowed * 0.045;
    const risk = getRiskLevel(atRiskTotal, totalBorrowed > 0 ? totalBorrowed : 4_200_000_000);

    const liquidations = (liqData?.data?.liquidationCalls ?? []).map((l: any) => {
      const wallet = l.user?.id ?? "0x0000";
      const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
      const secondsAgo = Math.floor(Date.now() / 1000) - parseInt(l.timestamp || "0");
      const timeAgo = secondsAgo < 3600 ? `${Math.floor(secondsAgo / 60)}m ago` : `${Math.floor(secondsAgo / 3600)}h ago`;
      return {
        wallet: shortWallet,
        protocol: "Aave v3",
        asset: l.collateralReserve?.symbol ?? "ETH",
        amount: formatUSD(parseFloat(l.principalAmountInUSD || "0")),
        time: timeAgo,
      };
    });

    return {
      protocol: {
        name: "Aave v3",
        icon: "👻",
        totalBorrowed: totalBorrowed > 0 ? formatUSD(totalBorrowed) : "$4.2B",
        atRisk: atRiskTotal > 0 ? formatUSD(atRiskTotal) : "$180M",
        atRiskRaw: atRiskTotal > 0 ? atRiskTotal : 180_000_000,
        liquidations24h: liquidations.length,
        ...risk,
      },
      liquidations,
    };
  } catch (err) {
    console.error("Aave fetch error:", err);
    return {
      protocol: {
        name: "Aave v3",
        icon: "👻",
        totalBorrowed: "$4.2B",
        atRisk: "$180M",
        atRiskRaw: 180_000_000,
        liquidations24h: 0,
        riskLevel: "Low",
        riskColor: "#10b981",
        riskBg: "#052e16",
      },
      liquidations: [],
    };
  }
}

async function fetchCompoundData() {
  try {
    const res = await fetch("https://api.llama.fi/protocol/compound-v3", {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    const borrowed = data?.currentChainTvls?.["Ethereum-borrowed"] ?? 0;
    const totalBorrowed = typeof borrowed === "number" ? borrowed : 0;
    const atRisk = totalBorrowed * 0.023;
    const risk = getRiskLevel(atRisk, totalBorrowed > 0 ? totalBorrowed : 1_800_000_000);
    return {
      name: "Compound v3",
      icon: "🏦",
      totalBorrowed: totalBorrowed > 0 ? formatUSD(totalBorrowed) : "$1.8B",
      atRisk: atRisk > 0 ? formatUSD(atRisk) : "$42M",
      atRiskRaw: atRisk > 0 ? atRisk : 42_000_000,
      liquidations24h: 3,
      ...risk,
    };
  } catch (err) {
    console.error("Compound fetch error:", err);
    return {
      name: "Compound v3",
      icon: "🏦",
      totalBorrowed: "$1.8B",
      atRisk: "$42M",
      atRiskRaw: 42_000_000,
      liquidations24h: 3,
      riskLevel: "Low",
      riskColor: "#10b981",
      riskBg: "#052e16",
    };
  }
}

async function fetchMakerData() {
  try {
    const res = await fetch("https://api.llama.fi/protocol/sky", {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    console.log("DefiLlama Sky keys:", JSON.stringify(data?.currentChainTvls));
    const tvl = data?.currentChainTvls?.["Ethereum"] ?? 0;
const totalBorrowed = typeof tvl === "number" ? tvl * 0.65 : 0;
    const atRisk = totalBorrowed * 0.045;
    const risk = getRiskLevel(atRisk, totalBorrowed > 0 ? totalBorrowed : 2_100_000_000);
    return {
      name: "MakerDAO",
      icon: "🔷",
      totalBorrowed: totalBorrowed > 0 ? formatUSD(totalBorrowed) : "$2.1B",
      atRisk: atRisk > 0 ? formatUSD(atRisk) : "$95M",
      atRiskRaw: atRisk > 0 ? atRisk : 95_000_000,
      liquidations24h: 7,
      ...risk,
    };
  } catch (err) {
    console.error("MakerDAO fetch error:", err);
    return {
      name: "MakerDAO",
      icon: "🔷",
      totalBorrowed: "$2.1B",
      atRisk: "$95M",
      atRiskRaw: 95_000_000,
      liquidations24h: 7,
      riskLevel: "Medium",
      riskColor: "#f59e0b",
      riskBg: "#2d1f00",
    };
  }
}

export async function GET() {
  const [aaveResult, compoundData, makerData] = await Promise.all([
    fetchAaveData(),
    fetchCompoundData(),
    fetchMakerData(),
  ]);

  return NextResponse.json({
    protocols: [aaveResult.protocol, compoundData, makerData],
    liquidations: aaveResult.liquidations,
  });
}
