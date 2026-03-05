"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const protocols = [
  { name: "Aave v3", icon: "👻", slug: "aave", totalBorrowed: "$4.2B", atRisk: "$180M", liquidations24h: 14, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
  { name: "Compound v3", icon: "🏦", slug: "compound", totalBorrowed: "$1.8B", atRisk: "$42M", liquidations24h: 3, riskLevel: "Low", riskColor: "#10b981", riskBg: "#052e16" },
  { name: "MakerDAO", icon: "🔷", slug: "maker", totalBorrowed: "$2.1B", atRisk: "$95M", liquidations24h: 7, riskLevel: "Medium", riskColor: "#f59e0b", riskBg: "#2d1f00" },
];

const recentLiquidations = [
  { wallet: "0x3f4a...9c2b", protocol: "Aave v3", asset: "ETH", amount: "$84,200", time: "4m ago" },
  { wallet: "0xa12d...4e7f", protocol: "Compound", asset: "BTC", amount: "$210,500", time: "11m ago" },
  { wallet: "0x88bc...1d3a", protocol: "MakerDAO", asset: "ETH", amount: "$31,000", time: "23m ago" },
  { wallet: "0x5c9e...8b4f", protocol: "Aave v3", asset: "LINK", amount: "$12,400", time: "41m ago" },
];

export default function Home() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("liquidlens-dark") === "true";
    }
    return false;
  });

  const [lastUpdated, setLastUpdated] = useState("Loading...");

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    const interval = setInterval(() => {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 60000);
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
  const accent = "#3b82f6";

  return (
    <main style={{ fontFamily: "'Segoe UI', sans-serif", background: bg, minHeight: "100vh", paddingBottom: "70px", transition: "background 0.2s ease" }}>

      {/* Header */}
      <div style={{ background: headerBg, padding: "14px 20px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "13px" }}>L🔍</div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: textPrimary }}>LiquidLens</div>
            <div style={{ fontSize: "11px", color: textSecondary }}>DeFi Liquidation Monitor</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "10px", color: textSecondary, fontFamily: "monospace" }}>Updated {lastUpdated}</div>
          <button onClick={toggleDark} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${headerBorder}`, background: dark ? "#1e2a40" : "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px 16px 0" }}>
        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Total at Risk</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#f97316" }}>$317M</div>
          <div style={{ fontSize: "10px", color: textSecondary, marginTop: "2px" }}>across 3 protocols</div>
        </div>
        <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Liquidations 24h</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#ef4444" }}>24</div>
          <div style={{ fontSize: "10px", color: textSecondary, marginTop: "2px" }}>↑ 6 from yesterday</div>
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Protocol Overview */}
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

        {/* Recent Liquidations */}
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

        {/* Monitor Your Position CTA */}
        <Link href="/positions" style={{ textDecoration: "none" }}>
          <div style={{ background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>Monitor Your Positions</div>
              <div style={{ fontSize: "12px", color: "#93c5fd" }}>Enter your wallet to check liquidation risk</div>
            </div>
            <div style={{ fontSize: "20px" }}>→</div>
          </div>
        </Link>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: dark ? "#4b5563" : "#9ca3af", marginBottom: "8px" }}>Not financial advice</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <a href="/terms" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Terms of Service</a>
            <a href="/privacy" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Privacy Policy</a>
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: navBg, borderTop: `1px solid ${navBorder}`, display: "flex", padding: "8px 0", zIndex: 100, transition: "background 0.2s ease" }}>
        <a href="/" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: accent }}>Market</span>
        </a>
        <a href="/positions" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: textSecondary }}>Positions</span>
        </a>
        <a href="/alerts" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: textSecondary }}>Alerts</span>
        </a>
      </div>

    </main>
  );
}
