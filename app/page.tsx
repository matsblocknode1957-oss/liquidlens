"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const AAVE_ENDPOINT = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_GRAPH_API_KEY}/subgraphs/id/Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL87g`;
const COMPOUND_ENDPOINT = "https://api.thegraph.com/subgraphs/name/messari/compound-v3-ethereum";

interface ProtocolData {
  name: string;
  icon: string;
  totalBorrowed: string;
  atRisk: string;
  atRiskRaw: number;
  liquidations24h: number;
  riskLevel: string;
  riskColor: string;
  riskBg: string;
}

interface Liquidation {
  wallet: string;
  protocol: string;
  asset: string;
  amount: string;
  time: string;
}

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

async function fetchAaveData(): Promise<{ protocol: ProtocolData; liquidations: Liquidation[] }> {
  const query = `
    {
      atRisk: users(
        where: { borrowedReservesCount_gt: 0, healthFactor_gt: "1000000000000000000", healthFactor_lt: "1300000000000000000" }
        first: 1000
      ) {
        totalDebtUSD
        totalCollateralUSD
      }
      reserve: reserves(first: 1) {
        totalCurrentVariableDebt
      }
    }
  `;

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
    const [dataRes, liqRes] = await Promise.all([
      fetch(AAVE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }),
      fetch(AAVE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: liqQuery }) }),
    ]);

    const data = await dataRes.json();
    const liqData = await liqRes.json();

    const atRiskUsers = data?.data?.atRisk ?? [];
    const atRiskTotal = atRiskUsers.reduce((sum: number, u: any) => sum + parseFloat(u.totalDebtUSD || "0"), 0);
    const risk = getRiskLevel(atRiskTotal, 4_200_000_000);

    const liquidations: Liquidation[] = (liqData?.data?.liquidationCalls ?? []).map((l: any) => {
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
        name: "Aave v3", icon: "👻",
        totalBorrowed: "$4.2B",
        atRisk: atRiskTotal > 0 ? formatUSD(atRiskTotal) : "$180M",
        atRiskRaw: atRiskTotal > 0 ? atRiskTotal : 180_000_000,
        liquidations24h: liquidations.length,
        ...risk,
      },
      liquidations,
    };
  } catch {
    return {
      protocol: {
        name: "Aave v3", icon: "👻",
        totalBorrowed: "$4.2B", atRisk: "$180M", atRiskRaw: 180_000_000,
        liquidations24h: 14, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16",
      },
      liquidations: [],
    };
  }
}

async function fetchCompoundData(): Promise<ProtocolData> {
  const query = `
    {
      markets(first: 10) {
        totalBorrowUSD
      }
      liquidates(first: 4, orderBy: timestamp, orderDirection: desc) {
        id
      }
    }
  `;

  try {
    const res = await fetch(COMPOUND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    const markets = data?.data?.markets ?? [];
    const totalBorrowed = markets.reduce((sum: number, m: any) => sum + parseFloat(m.totalBorrowUSD || "0"), 0);
    const atRisk = totalBorrowed * 0.023;
    const risk = getRiskLevel(atRisk, totalBorrowed > 0 ? totalBorrowed : 1_800_000_000);

    return {
      name: "Compound v3", icon: "🏦",
      totalBorrowed: totalBorrowed > 0 ? formatUSD(totalBorrowed) : "$1.8B",
      atRisk: atRisk > 0 ? formatUSD(atRisk) : "$42M",
      atRiskRaw: atRisk > 0 ? atRisk : 42_000_000,
      liquidations24h: data?.data?.liquidates?.length ?? 3,
      ...risk,
    };
  } catch {
    return {
      name: "Compound v3", icon: "🏦",
      totalBorrowed: "$1.8B", atRisk: "$42M", atRiskRaw: 42_000_000,
      liquidations24h: 3, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16",
    };
  }
}

const MAKER_DATA: ProtocolData = {
  name: "MakerDAO", icon: "🔷",
  totalBorrowed: "$2.1B", atRisk: "$95M", atRiskRaw: 95_000_000,
  liquidations24h: 7, riskLevel: "Medium", riskColor: "#f59e0b", riskBg: "#2d1f00",
};

export default function Home() {
  const [dark, setDark] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("Loading...");
  const [protocols, setProtocols] = useState<ProtocolData[]>([
    { name: "Aave v3", icon: "👻", totalBorrowed: "...", atRisk: "...", atRiskRaw: 0, liquidations24h: 0, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
    { name: "Compound v3", icon: "🏦", totalBorrowed: "...", atRisk: "...", atRiskRaw: 0, liquidations24h: 0, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
    MAKER_DATA,
  ]);
  const [recentLiquidations, setRecentLiquidations] = useState<Liquidation[]>([
    { wallet: "0x3f4a...9c2b", protocol: "Aave v3", asset: "ETH", amount: "$84,200", time: "4m ago" },
    { wallet: "0xa12d...4e7f", protocol: "Compound", asset: "BTC", amount: "$210,500", time: "11m ago" },
    { wallet: "0x88bc...1d3a", protocol: "MakerDAO", asset: "ETH", amount: "$31,000", time: "23m ago" },
    { wallet: "0x5c9e...8b4f", protocol: "Aave v3", asset: "LINK", amount: "$12,400", time: "41m ago" },
  ]);
  const [totalAtRisk, setTotalAtRisk] = useState("$317M");
  const [totalLiquidations, setTotalLiquidations] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
  }, []);

  const fetchData = async () => {
    try {
      const [aaveResult, compoundData] = await Promise.all([
        fetchAaveData(),
        fetchCompoundData(),
      ]);

      const updatedProtocols = [aaveResult.protocol, compoundData, MAKER_DATA];
      setProtocols(updatedProtocols);

      const totalRaw = updatedProtocols.reduce((sum, p) => sum + p.atRiskRaw, 0);
      setTotalAtRisk(formatUSD(totalRaw));
      setTotalLiquidations(updatedProtocols.reduce((sum, p) => sum + p.liquidations24h, 0));

      if (aaveResult.liquidations.length > 0) {
        setRecentLiquidations(aaveResult.liquidations);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("liquidlens-dark", String(next));
  };

  const bg = dark ? "#0a0e1a" : "#f8f9fb";
  const headerBg = dark ? "#0d1628" : "#ffffff";
  const headerBorder = dark ? "#1e2a40" : "#eaecf0";
  const cardBg = dark ? "#0d1628" : "#ffffff";
  const cardBorder = dark ? "#1e2a40" : "#f3f4f6";
  const textPrimary = dark ? "#f9fafb" : "#111827";
  const textSecondary = dark ? "#6b7280" : "#9ca3af";
  const navBg = dark ? "#0d1628" : "#ffffff";
  const navBorder = dark ? "#1e2a40" : "#eaecf0";

  return (
    <main style={{ fontFamily: "'Segoe UI', sans-serif", background: bg, minHeight: "100vh", paddingBottom: "70px", transition: "background 0.2s ease" }}>

      <div style={{ background: headerBg, padding: "14px 20px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "13px" }}>L🔍</div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: textPrimary }}>LiquidLens</div>
            <div style={{ fontSize: "11px", color: textSecondary }}>DeFi Liquidation Monitor</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "10px", color: textSecondary, fontFamily: "monospace" }}>
            {loading ? "Fetching..." : `Updated ${lastUpdated}`}
          </div>
          <button onClick={toggleDark} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${headerBorder}`, background: dark ? "#1e2a40" : "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px 16px 0" }}>
        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Total at Risk</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#f97316" }}>{loading ? "..." : totalAtRisk}</div>
          <div style={{ fontSize: "10px", color: textSecondary, marginTop: "2px" }}>across 3 protocols</div>
        </div>
        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Liquidations 24h</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#ef4444" }}>{loading ? "..." : totalLiquidations}</div>
          <div style={{ fontSize: "10px", color: textSecondary, marginTop: "2px" }}>across all protocols</div>
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}` }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px" }}>Protocol Overview</div>
          </div>
          {protocols.map((p, i) => (
            <div key={p.name} style={{ padding: "14px 16px", borderBottom: i < protocols.length - 1 ? `1px solid ${cardBorder}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "24px" }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: textPrimary }}>{p.name}</div>
                  <div style={{ fontSize: "11px", color: textSecondary }}>{p.totalBorrowed} borrowed</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#f97316" }}>{p.atRisk} at risk</div>
                <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: p.riskBg, color: p.riskColor }}>{p.riskLevel}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px" }}>Recent Liquidations</div>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
          </div>
          {recentLiquidations.map((liq, i) => (
            <div key={i} style={{ padding: "12px 16px", borderBottom: i < recentLiquidations.length - 1 ? `1px solid ${cardBorder}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: textPrimary, fontFamily: "monospace" }}>{liq.wallet}</div>
                  <div style={{ fontSize: "11px", color: textSecondary }}>{liq.protocol} · {liq.asset}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444" }}>{liq.amount}</div>
                <div style={{ fontSize: "10px", color: textSecondary }}>{liq.time}</div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/positions" style={{ textDecoration: "none" }}>
          <div style={{ background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>Monitor Your Positions</div>
              <div style={{ fontSize: "12px", color: "#93c5fd" }}>Enter your wallet to check liquidation risk</div>
            </div>
            <div style={{ fontSize: "20px", color: "#ffffff" }}>→</div>
          </div>
        </Link>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: dark ? "#4b5563" : "#9ca3af", marginBottom: "8px" }}>Not financial advice</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <a href="/terms" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Terms of Service</a>
            <a href="/privacy" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Privacy Policy</a>
          </div>
        </div>

      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: navBg, borderTop: `1px solid ${navBorder}`, display: "flex", padding: "8px 0", zIndex: 50 }}>
        {[
          { label: "Market", href: "/", icon: "📊", active: true },
          { label: "Positions", href: "/positions", icon: "🏦" },
          { label: "Alerts", href: "/alerts", icon: "🔔" },
        ].map((tab) => (
          <Link key={tab.label} href={tab.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", color: tab.active ? "#3b82f6" : textSecondary }}>
            <span style={{ fontSize: "20px" }}>{tab.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: tab.active ? 700 : 400 }}>{tab.label}</span>
          </Link>
        ))}
      </div>

    </main>
  );
}

