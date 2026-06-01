"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

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

interface ChainlinkPrices {
  ETH: number;
  BTC: number;
  source: string;
}

function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("Loading...");
  const [protocols, setProtocols] = useState<ProtocolData[]>([
    { name: "Aave v3", icon: "👻", totalBorrowed: "...", atRisk: "...", atRiskRaw: 0, liquidations24h: 0, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
    { name: "Compound v3", icon: "🏦", totalBorrowed: "...", atRisk: "...", atRiskRaw: 0, liquidations24h: 0, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
    { name: "MakerDAO", icon: "🔷", totalBorrowed: "...", atRisk: "...", atRiskRaw: 0, liquidations24h: 0, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
  ]);
  const [recentLiquidations, setRecentLiquidations] = useState<Liquidation[]>([
    { wallet: "0x3f4a...9c2b", protocol: "Aave v3", asset: "ETH", amount: "$84,200", time: "4m ago" },
    { wallet: "0xa12d...4e7f", protocol: "Compound", asset: "BTC", amount: "$210,500", time: "11m ago" },
    { wallet: "0x88bc...1d3a", protocol: "MakerDAO", asset: "ETH", amount: "$31,000", time: "23m ago" },
    { wallet: "0x5c9e...8b4f", protocol: "Aave v3", asset: "LINK", amount: "$12,400", time: "41m ago" },
  ]);
  const [isLiveLiquidations, setIsLiveLiquidations] = useState(false);
  const [totalAtRisk, setTotalAtRisk] = useState("$317M");
  const [totalLiquidations, setTotalLiquidations] = useState(24);
  const [loading, setLoading] = useState(true);
  const [chainlinkPrices, setChainlinkPrices] = useState<ChainlinkPrices | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      setProtocols(json.protocols);
      if (json.liquidations.length > 0) {
        setRecentLiquidations(json.liquidations);
        setIsLiveLiquidations(true);
      }
      const totalRaw = json.protocols.reduce((sum: number, p: any) => sum + p.atRiskRaw, 0);
      setTotalAtRisk(formatUSD(totalRaw));
      setTotalLiquidations(json.protocols.reduce((sum: number, p: any) => sum + p.liquidations24h, 0));
      if (json.chainlinkPrices) setChainlinkPrices(json.chainlinkPrices);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      // keep existing state
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
return  (
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

      {chainlinkPrices && (chainlinkPrices.ETH > 0 || chainlinkPrices.BTC > 0) && (
        <div style={{ margin: "10px 16px 0", background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            {chainlinkPrices.ETH > 0 && (
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>ETH </span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: textPrimary }}>${chainlinkPrices.ETH.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {chainlinkPrices.BTC > 0 && (
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>BTC </span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: textPrimary }}>${chainlinkPrices.BTC.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
          <a href="https://chain.link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", color: "#375BD2", textDecoration: "none" }}>
            <span style={{ fontSize: "10px" }}>⬡</span>
            Chainlink
          </a>
        </div>
      )}

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}` }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px" }}>Protocol Overview</div>
          </div>
          {protocols.map((p, i) => (
            <div key={p.name} style={{ padding: "14px 16px", borderBottom: i < protocols.length - 1 ? `1px solid ${cardBorder}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
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
              <div style={{ background: dark ? "#1e2a40" : "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: "4px",
                  background: p.riskColor,
                  width: p.riskLevel === "Low" ? "25%" : p.riskLevel === "Medium" ? "60%" : "90%",
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px" }}>Recent Liquidations</div>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLiveLiquidations ? "#10b981" : "#6b7280" }} />
          </div>
          {!loading && !isLiveLiquidations && (
            <div style={{ padding: "8px 16px", background: dark ? "#1a1f2e" : "#f3f4f6", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px" }}>⚠️</span>
              <span style={{ fontSize: "11px", color: textSecondary }}>Sample Data — live liquidations unavailable</span>
            </div>
          )}
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
          <div style={{ fontSize: "10px", color: dark ? "#4b5563" : "#9ca3af", marginBottom: "10px" }}>Not financial advice</div>
          <div style={{ marginBottom: "12px" }}>
            <a href="https://chain.link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", background: "#375BD2", fontSize: "12px", fontWeight: 600, color: "#ffffff", textDecoration: "none" }}>
              <span style={{ fontSize: "11px" }}>⬡</span>
              Powered by Chainlink
            </a>
          </div>
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

