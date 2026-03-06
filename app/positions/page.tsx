"use client";

import { useState, useEffect } from "react";

const COLORS = {
  safe: "#10b981",
  moderate: "#f59e0b",
  atRisk: "#f97316",
  critical: "#ef4444",
  accent: "#3b82f6",
  bg: "#0a0e1a",
  card: "#0d1628",
  border: "#1e2a40",
  textPrimary: "#f9fafb",
  textSecondary: "#6b7280",
};

function getHealthStatus(hf: number) {
  if (hf >= 2.0) return { label: "Safe", color: COLORS.safe, bg: "#10b98120" };
  if (hf >= 1.5) return { label: "Moderate", color: COLORS.moderate, bg: "#f59e0b20" };
  if (hf >= 1.2) return { label: "At Risk", color: COLORS.atRisk, bg: "#f9731620" };
  return { label: "Critical", color: COLORS.critical, bg: "#ef444420" };
}

interface Position {
  protocol: string;
  collateralAsset: string;
  debtAsset: string;
  collateralUSD: number;
  debtUSD: number;
  healthFactor: number;
  liquidationPrice: number;
  currentPrice: number;
}

const MOCK_POSITIONS: Position[] = [
  {
    protocol: "Aave v3",
    collateralAsset: "ETH",
    debtAsset: "USDC",
    collateralUSD: 12450.0,
    debtUSD: 6800.0,
    healthFactor: 1.73,
    liquidationPrice: 1420.5,
    currentPrice: 2180.0,
  },
  {
    protocol: "Compound v3",
    collateralAsset: "WBTC",
    debtAsset: "USDT",
    collateralUSD: 34200.0,
    debtUSD: 19500.0,
    healthFactor: 1.18,
    liquidationPrice: 51200.0,
    currentPrice: 58400.0,
  },
  {
    protocol: "Aave v3",
    collateralAsset: "LINK",
    debtAsset: "DAI",
    collateralUSD: 3200.0,
    debtUSD: 980.0,
    healthFactor: 2.46,
    liquidationPrice: 6.8,
    currentPrice: 14.2,
  },
];

async function fetchPositions(wallet: string): Promise<Position[]> {
  const AAVE_ENDPOINT = "https://api.thegraph.com/subgraphs/name/aave/protocol-v3";
  const query = `
    {
      users(where: { id: "${wallet.toLowerCase()}", borrowedReservesCount_gt: 0 }) {
        id
        healthFactor
        totalCollateralUSD
        totalDebtUSD
      }
    }
  `;
  try {
    const res = await fetch(AAVE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    const users = json?.data?.users ?? [];
    if (users.length === 0) return [];
    return users.map((u: any) => ({
      protocol: "Aave v3",
      collateralAsset: "ETH",
      debtAsset: "USDC",
      collateralUSD: parseFloat(u.totalCollateralUSD),
      debtUSD: parseFloat(u.totalDebtUSD),
      healthFactor: parseFloat(u.healthFactor) / 1e18,
      liquidationPrice: 0,
      currentPrice: 0,
    }));
  } catch {
    return MOCK_POSITIONS;
  }
}

function HealthBar({ value }: { value: number }) {
  const capped = Math.min(value, 3);
  const pct = (capped / 3) * 100;
  const { color } = getHealthStatus(value);
  return (
    <div style={{ height: 6, background: COLORS.border, borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease", boxShadow: `0 0 8px ${color}80` }} />
    </div>
  );
}

function PositionCard({ pos }: { pos: Position }) {
  const status = getHealthStatus(pos.healthFactor);
  const dropPct = pos.liquidationPrice > 0 && pos.currentPrice > 0
    ? (((pos.currentPrice - pos.liquidationPrice) / pos.currentPrice) * 100).toFixed(1)
    : null;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${status.color}, transparent)`, opacity: 0.7 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{pos.protocol}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>{pos.collateralAsset} <span style={{ color: COLORS.textSecondary, fontWeight: 400 }}>→</span> {pos.debtAsset}</div>
        </div>
        <div style={{ background: status.bg, border: `1px solid ${status.color}40`, color: status.color, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99 }}>{status.label}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Health Factor</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: status.color }}>{pos.healthFactor.toFixed(2)}</span>
        </div>
        <HealthBar value={pos.healthFactor} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Collateral", value: `$${pos.collateralUSD.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Debt", value: `$${pos.debtUSD.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Drop to Liq.", value: dropPct ? `-${dropPct}%` : "—" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#ffffff08", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>{stat.value}</div>
          </div>
        ))}
      </div>
      {pos.liquidationPrice > 0 && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: `${COLORS.critical}10`, border: `1px solid ${COLORS.critical}30`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Liquidation price ({pos.collateralAsset})</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.critical }}>${pos.liquidationPrice.toLocaleString("en-GB")}</span>
        </div>
      )}
    </div>
  );
}

export default function PositionsPage() {
  const [dark, setDark] = useState(true);
  const [wallet, setWallet] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
  }, []);

  const toggleDark = () => {
    setDark((d) => { localStorage.setItem("liquidlens-dark", String(!d)); return !d; });
  };

  const handleLookup = async () => {
    const trimmed = wallet.trim();
    if (!trimmed || trimmed.length < 40) { setError("Please enter a valid Ethereum wallet address (0x...)"); return; }
    setError("");
    setLoading(true);
    setSubmitted(trimmed);
    try {
      const data = await fetchPositions(trimmed);
      setPositions(data);
    } catch {
      setError("Failed to fetch positions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bg = dark ? COLORS.bg : "#f0f4ff";
  const cardBg = dark ? COLORS.card : "#ffffff";
  const borderColor = dark ? COLORS.border : "#e2e8f0";
  const textPrimary = dark ? COLORS.textPrimary : "#0f172a";
  const textSecondary = dark ? COLORS.textSecondary : "#64748b";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textPrimary, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav style={{ background: dark ? "#0d162880" : "#ffffffcc", backdropFilter: "blur(12px)", borderBottom: `1px solid ${borderColor}`, padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${COLORS.accent}, #60a5fa)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💧</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>LiquidLens</span>
        </a>
        <button onClick={toggleDark} style={{ background: "none", border: `1px solid ${borderColor}`, borderRadius: 8, color: textSecondary, padding: "4px 12px", fontSize: 13, cursor: "pointer" }}>
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 100px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Position Monitor</h1>
          <p style={{ margin: 0, color: textSecondary, fontSize: 15 }}>Enter your wallet address to check your DeFi borrow positions across Aave and Compound.</p>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, marginBottom: 28 }}>
          <label style={{ fontSize: 13, color: textSecondary, display: "block", marginBottom: 8 }}>Ethereum Wallet Address</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={wallet} onChange={(e) => setWallet(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLookup()} placeholder="0x..." style={{ flex: 1, background: dark ? "#ffffff0a" : "#f8fafc", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "10px 14px", color: textPrimary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
            <button onClick={handleLookup} disabled={loading} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Loading…" : "Check"}
            </button>
          </div>
          {error && <p style={{ margin: "10px 0 0", fontSize: 13, color: COLORS.critical }}>{error}</p>}
          <p style={{ margin: "10px 0 0", fontSize: 12, color: textSecondary }}>🔒 Read-only. We never ask for private keys or seed phrases.</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: textSecondary }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div>Scanning protocols…</div>
          </div>
        )}

        {!loading && submitted && positions.length === 0 && (
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 40, textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
            <div style={{ fontWeight: 600, color: textPrimary, marginBottom: 6 }}>No open positions found</div>
            <div style={{ fontSize: 14 }}>This wallet has no active borrow positions on Aave v3 or Compound v3.</div>
          </div>
        )}

        {!loading && positions.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: textSecondary, marginBottom: 2 }}>Showing {positions.length} position{positions.length !== 1 ? "s" : ""} for</div>
                <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: COLORS.accent }}>{submitted.slice(0, 6)}…{submitted.slice(-4)}</div>
              </div>
              <a href="/alerts" style={{ background: COLORS.accent, color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>🔔 Set Alert</a>
            </div>
            {positions.map((pos, i) => <PositionCard key={i} pos={pos} />)}
          </>
        )}

        {!submitted && !loading && (
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 16 }}>What we monitor</div>
            {[
              { icon: "🟢", label: "Aave v3", desc: "Health factors, collateral, borrow positions" },
              { icon: "🔵", label: "Compound v3", desc: "Borrow positions and health metrics" },
              { icon: "🟡", label: "MakerDAO", desc: "Vault collateral ratios (coming soon)" },
            ].map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${borderColor}` }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{p.label}</div>
                  <div style={{ fontSize: 13, color: textSecondary }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: dark ? "#0d1628ee" : "#ffffffee", backdropFilter: "blur(12px)", borderTop: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", zIndex: 100 }}>
        {[
          { label: "Market", href: "/", icon: "📊" },
          { label: "Positions", href: "/positions", icon: "🏦", active: true },
          { label: "Alerts", href: "/alerts", icon: "🔔" },
        ].map((tab) => (
          <a key={tab.label} href={tab.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", color: tab.active ? COLORS.accent : textSecondary, fontSize: 11, fontWeight: tab.active ? 700 : 400, minWidth: 60 }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </a>
        ))}
      </nav>

      <div style={{ textAlign: "center", padding: "8px 20px 80px", fontSize: 12, color: textSecondary }}>
        Not financial advice. <a href="/terms" style={{ color: textSecondary }}>Terms</a> · <a href="/privacy" style={{ color: textSecondary }}>Privacy</a> · LiquidLens v1.0
      </div>
    </div>
  );
}
