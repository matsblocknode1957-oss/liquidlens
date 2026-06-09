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

interface FearGreedData {
  score: number;
  classification: string;
  yesterdayScore: number;
  yesterdayClassification: string;
}

interface DepegAlert {
  coin: string;
  signal: "HEDGE" | "EXIT";
  consensus_deviation_bps: number;
  pegcheck_url: string;
}

function getFearGreedColors(classification: string): { color: string; bg: string } {
  const c = classification.toLowerCase();
  if (c.includes("extreme fear")) return { color: "#ef4444", bg: "#2d0a0a" };
  if (c.includes("fear")) return { color: "#f97316", bg: "#2d1a00" };
  if (c.includes("extreme greed")) return { color: "#22c55e", bg: "#052e16" };
  if (c.includes("greed")) return { color: "#10b981", bg: "#042616" };
  return { color: "#9ca3af", bg: "#111827" };
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
  const [recentLiquidations, setRecentLiquidations] = useState<Liquidation[]>([]);
  const [totalAtRisk, setTotalAtRisk] = useState("$317M");
  const [totalLiquidations, setTotalLiquidations] = useState(24);
  const [loading, setLoading] = useState(true);
  const [chainlinkPrices, setChainlinkPrices] = useState<ChainlinkPrices | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [depegAlerts, setDepegAlerts] = useState<DepegAlert[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      setProtocols(json.protocols);
      setRecentLiquidations(json.liquidations);
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
    try {
      const fgRes = await fetch("/api/fear-greed");
      setFearGreed(await fgRes.json());
    } catch {
      // keep existing state
    }
    try {
      const daRes = await fetch("/api/depeg-status");
      setDepegAlerts(await daRes.json());
    } catch {
      // keep existing state
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
  const fgColors = fearGreed ? getFearGreedColors(fearGreed.classification) : null;
  const fgYestColors = fearGreed ? getFearGreedColors(fearGreed.yesterdayClassification) : null;
  const fgDelta = fearGreed ? fearGreed.score - fearGreed.yesterdayScore : 0;
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

        {fearGreed && fgColors && fgYestColors && (
          <div style={{ background: cardBg, borderRadius: "12px", border: `1px solid ${cardBorder}`, padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" }}>Fear & Greed Index</div>
            <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: fgColors.bg, border: `3px solid ${fgColors.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: fgColors.color, lineHeight: "1" }}>{fearGreed.score}</div>
                <div style={{ fontSize: "9px", color: fgColors.color, opacity: 0.8 }}>/100</div>
              </div>
              <div>
                <div style={{ fontSize: "17px", fontWeight: "700", color: fgColors.color, marginBottom: "4px" }}>{fearGreed.classification}</div>
                <div style={{ fontSize: "11px", color: textSecondary }}>
                  Yesterday:{" "}
                  <span style={{ color: fgYestColors.color, fontWeight: "600" }}>{fearGreed.yesterdayScore}</span>
                  {" "}
                  <span style={{ color: fgDelta > 0 ? "#22c55e" : fgDelta < 0 ? "#ef4444" : textSecondary, fontWeight: "600" }}>
                    {fgDelta > 0 ? `↑${fgDelta}` : fgDelta < 0 ? `↓${Math.abs(fgDelta)}` : "→"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ background: dark ? "#1e2a40" : "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{ height: "100%", borderRadius: "4px", background: fgColors.color, width: `${fearGreed.score}%`, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: "10px", color: textSecondary, fontStyle: "italic" }}>
              High Greed = overleveraged market = elevated liquidation risk
            </div>
          </div>
        )}

        {depegAlerts.map((alert) => {
          const isExit = alert.signal === "EXIT";
          return (
            <div key={alert.coin} style={{
              background: isExit ? (dark ? "#2d0a0a" : "#fef2f2") : (dark ? "#2d1f00" : "#fffbeb"),
              border: `1px solid ${isExit ? "#ef4444" : "#f59e0b"}`,
              borderRadius: "10px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "10px",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: isExit ? "#ef4444" : "#f59e0b", marginBottom: "3px" }}>
                  ⚠️ {alert.coin} showing {alert.signal} signal on PegCheck — {alert.consensus_deviation_bps} bps deviation detected.
                </div>
                <div style={{ fontSize: "11px", color: textSecondary }}>
                  Stablecoin risk may impact DeFi collateral.
                </div>
              </div>
              <a href="https://pegcheck.uk" target="_blank" rel="noopener noreferrer" style={{
                fontSize: "11px", fontWeight: "600",
                color: isExit ? "#ef4444" : "#f59e0b",
                textDecoration: "none", whiteSpace: "nowrap", paddingTop: "1px",
              }}>
                View on PegCheck →
              </a>
            </div>
          );
        })}

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
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}` }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.6px" }}>Recent Liquidations</div>
          </div>
          {!loading && recentLiquidations.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", fontSize: "13px", color: textSecondary }}>
              No liquidations in the last 24 hours — market is calm 🟢
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

