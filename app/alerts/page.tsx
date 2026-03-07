"use client";
import { useState } from "react";

export default function AlertsPage() {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [threshold, setThreshold] = useState(1.5);
  const [upgrading, setUpgrading] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("liquidlens-dark") === "true";
    }
    return false;
  });

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("liquidlens-dark", String(next));
  };

  const handleUpgrade = async () => {
    if (!email.includes("@")) {
      alert("Please enter your email first");
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wallet, threshold }),
      });
      const data = await res.json();
      
if (data.url) window.location.href = data.url;
    } catch (e) {
      setUpgrading(false);
    }
  };

  const bg = dark ? "#0a0e1a" : "#f8f9fb";
  const headerBg = dark ? "#0d1628" : "#ffffff";
  const headerBorder = dark ? "#1e2a40" : "#eaecf0";
  const cardBg = dark ? "#0d1628" : "#ffffff";
  const cardBorder = dark ? "#1e2a40" : "#eaecf0";
  const textPrimary = dark ? "#f9fafb" : "#111827";
  const textSecondary = dark ? "#6b7280" : "#9ca3af";
  const inputBg = dark ? "#111f38" : "#ffffff";
  const inputBorder = dark ? "#1e2a40" : "#e5e7eb";
  const navBg = dark ? "#0d1628" : "#ffffff";
  const navBorder = dark ? "#1e2a40" : "#eaecf0";

  const thresholds = [
    { value: 2.0, label: "2.0", desc: "Conservative — alert when moderately safe", color: "#10b981" },
    { value: 1.5, label: "1.5", desc: "Balanced — alert when getting risky", color: "#f59e0b" },
    { value: 1.2, label: "1.2", desc: "Aggressive — alert when critical", color: "#ef4444" },
  ];

  return (
    <main style={{ fontFamily: "'Segoe UI', sans-serif", background: bg, minHeight: "100vh", paddingBottom: "70px", transition: "background 0.2s ease" }}>

      <div style={{ background: headerBg, padding: "14px 20px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "14px" }}>L🔍</div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: textPrimary }}>LiquidLens</div>
            <div style={{ fontSize: "11px", color: textSecondary }}>DeFi Position Monitor</div>
          </div>
        </div>
        <button onClick={toggleDark} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${headerBorder}`, background: dark ? "#1e2a40" : "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      <div style={{ margin: "16px 20px 0", background: "linear-gradient(135deg, #1e3a5f, #0d1628)", borderRadius: "12px", padding: "20px", border: `1px solid #1e3a5f` }}>
        <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", marginBottom: "6px" }}>⚡ Never Get Liquidated Again</div>
        <div style={{ fontSize: "13px", color: "#93c5fd", lineHeight: "1.5" }}>Get instant email alerts when your health factor drops below your chosen threshold. React before the market does.</div>
      </div>

      <div style={{ margin: "16px 20px 0", background: cardBg, borderRadius: "12px", padding: "20px", border: `1px solid ${cardBorder}` }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: textPrimary, marginBottom: "14px" }}>Alert Threshold</div>
        {thresholds.map((t) => (
          <div
            key={t.value}
            onClick={() => setThreshold(t.value)}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "8px", border: `2px solid ${threshold === t.value ? t.color : (dark ? "#1e2a40" : "#e5e7eb")}`, marginBottom: "8px", cursor: "pointer", background: threshold === t.value ? (dark ? "#080e1a" : "#f8f9fb") : "transparent", transition: "all 0.15s ease" }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: threshold === t.value ? t.color : (dark ? "#1e2a40" : "#f3f4f6"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px", color: threshold === t.value ? "#ffffff" : textSecondary, flexShrink: 0 }}>{t.label}</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: textPrimary }}>Health Factor {t.label}</div>
              <div style={{ fontSize: "11px", color: textSecondary }}>{t.desc}</div>
            </div>
            {threshold === t.value && (
              <div style={{ marginLeft: "auto", width: "20px", height: "20px", borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ margin: "16px 20px 0", background: cardBg, borderRadius: "12px", padding: "20px", border: `1px solid ${cardBorder}` }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: textPrimary, marginBottom: "14px" }}>Your Details</div>
        <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "6px" }}>Email address</div>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${inputBorder}`, fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", outline: "none", background: inputBg, color: textPrimary }}
        />
        <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "6px" }}>Wallet address to monitor</div>
        <input
          type="text"
          placeholder="0x... (optional — add later)"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${inputBorder}`, fontSize: "13px", marginBottom: "16px", boxSizing: "border-box", outline: "none", background: inputBg, color: textPrimary, fontFamily: "monospace" }}
        />
        <button
          onClick={handleUpgrade}
          style={{ width: "100%", padding: "14px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", fontSize: "15px", fontWeight: "700", border: "none", cursor: "pointer" }}
        >
          {upgrading ? "Redirecting to checkout..." : "Get Alerts — £4.99/month ⚡"}
        </button>
        <div style={{ fontSize: "11px", color: textSecondary, textAlign: "center", marginTop: "8px" }}>Cancel anytime. No contracts.</div>
      </div>

      <div style={{ margin: "16px 20px 0", background: cardBg, borderRadius: "12px", padding: "20px", border: `1px solid ${cardBorder}` }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>What you get ⚡</div>
        {[
          "Instant email when health factor hits your threshold",
          "Monitors Aave v3 and Compound v3",
          "Check every 5 minutes — react before liquidation",
          "Add up to 3 wallet addresses",
          "Cancel anytime",
        ].map((feature) => (
          <div key={feature} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: dark ? "#1e3a5f" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ fontSize: "13px", color: dark ? "#d1d5db" : "#374151" }}>{feature}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: dark ? "#4b5563" : "#9ca3af", marginBottom: "8px" }}>Not financial advice</div>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
          <a href="/terms" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Terms of Service</a>
          <a href="/privacy" style={{ fontSize: "12px", fontWeight: "600", color: dark ? "#6b7280" : "#4b5563", textDecoration: "none" }}>Privacy Policy</a>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: navBg, borderTop: `1px solid ${navBorder}`, display: "flex", padding: "8px 0", zIndex: 100 }}>
        <a href="/" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dark ? "#6b7280" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: dark ? "#6b7280" : "#9ca3af" }}>Market</span>
        </a>
        <a href="/positions" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dark ? "#6b7280" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: dark ? "#6b7280" : "#9ca3af" }}>Positions</span>
        </a>
        <a href="/alerts" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", textDecoration: "none", padding: "4px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#3b82f6" }}>Alerts</span>
        </a>
      </div>

    </main>
  );
}
