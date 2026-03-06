"use client";

import { useState, useEffect } from "react";

const COLORS = {
  accent: "#3b82f6",
  bg: "#0a0e1a",
  card: "#0d1628",
  border: "#1e2a40",
  textPrimary: "#f9fafb",
  textSecondary: "#6b7280",
  safe: "#10b981",
  moderate: "#f59e0b",
  atRisk: "#f97316",
  critical: "#ef4444",
};

const THRESHOLDS = [
  { value: 1.2, label: "1.2 — Critical only", desc: "Alert when you're on the edge. For experienced users.", color: COLORS.critical },
  { value: 1.5, label: "1.5 — At Risk (recommended)", desc: "A healthy buffer before liquidation. Most popular.", color: COLORS.atRisk, popular: true },
  { value: 1.8, label: "1.8 — Moderate", desc: "Early warning. More alerts, more peace of mind.", color: COLORS.moderate },
  { value: 2.0, label: "2.0 — Safe", desc: "Alert as soon as health drops below safe zone.", color: COLORS.safe },
];

export default function AlertsPage() {
  const [dark, setDark] = useState(true);
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [threshold, setThreshold] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setSuccess(true);
  }, []);

  const toggleDark = () => {
    setDark((d) => { localStorage.setItem("liquidlens-dark", String(!d)); return !d; });
  };

  const handleSubscribe = async () => {
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (!wallet || wallet.length < 40) { setError("Please enter a valid Ethereum wallet address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wallet, threshold }),
      });
      const { sessionId } = await res.json();
      const stripeJs = await import("@stripe/stripe-js");
const stripe = await stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
if (!stripe) throw new Error("Stripe failed to load");
const result = await (stripe as any).redirectToCheckout({ sessionId });
if (result.error) throw result.error;
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
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

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 120px" }}>

        {success ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>You're all set!</h1>
            <p style={{ color: textSecondary, fontSize: 15, marginBottom: 28 }}>We'll monitor your position every 60 seconds and email you before you're at risk of liquidation.</p>
            <a href="/positions" style={{ background: COLORS.accent, color: "#fff", textDecoration: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 600, fontSize: 15 }}>View your positions →</a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, background: `${COLORS.accent}20`, border: `1px solid ${COLORS.accent}40`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>🔔</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Liquidation Alerts</h1>
              <p style={{ margin: 0, color: textSecondary, fontSize: 15 }}>Get email alerts before your position is liquidated. We check every 60 seconds.</p>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}20, #60a5fa10)`, border: `1px solid ${COLORS.accent}40`, borderRadius: 16, padding: 20, marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>Premium alerts</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.02em" }}>£4.99<span style={{ fontSize: 14, fontWeight: 400, color: textSecondary }}> / month</span></div>
              </div>
              <div style={{ textAlign: "right" }}>
                {["60s monitoring", "Unlimited wallets", "Instant email alerts"].map((f) => (
                  <div key={f} style={{ fontSize: 12, color: COLORS.safe, marginBottom: 3, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                    <span>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: textSecondary, display: "block", marginBottom: 8, fontWeight: 500 }}>Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", background: dark ? "#ffffff0a" : "#f8fafc", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "11px 14px", color: textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: textSecondary, display: "block", marginBottom: 8, fontWeight: 500 }}>Wallet address to monitor</label>
                <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." style={{ width: "100%", background: dark ? "#ffffff0a" : "#f8fafc", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "11px 14px", color: textPrimary, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: textSecondary, display: "block", marginBottom: 12, fontWeight: 500 }}>Alert me when health factor drops below</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {THRESHOLDS.map((t) => {
                    const selected = threshold === t.value;
                    return (
                      <div key={t.value} onClick={() => setThreshold(t.value)} style={{ background: selected ? `${t.color}15` : dark ? "#ffffff06" : "#f8fafc", border: `1.5px solid ${selected ? t.color : borderColor}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.color}`, background: selected ? t.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: selected ? t.color : textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                            {t.label}
                            {t.popular && <span style={{ fontSize: 10, background: COLORS.accent, color: "#fff", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>POPULAR</span>}
                          </div>
                          <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{t.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{ background: `${COLORS.critical}15`, border: `1px solid ${COLORS.critical}40`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: COLORS.critical, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button onClick={handleSubscribe} disabled={loading} style={{ width: "100%", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Redirecting to payment…" : "Subscribe for £4.99/month"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: textSecondary, margin: "12px 0 0" }}>Powered by Stripe. Cancel anytime. Read-only wallet monitoring.</p>
            </div>

            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 16 }}>How it works</div>
              {[
                { q: "How often do you check my position?", a: "Every 60 seconds. We fetch live data from Aave and Compound subgraphs continuously." },
                { q: "Do you need my private keys?", a: "Never. We only need your public wallet address to read your on-chain position." },
                { q: "What happens when I get an alert?", a: "You'll receive an email showing your current health factor, collateral value, and how far you are from liquidation." },
                { q: "Can I cancel?", a: "Yes, anytime. Cancel from your Stripe billing portal and monitoring stops immediately." },
              ].map((item, i, arr) => (
                <div key={i} style={{ paddingBottom: 14, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${borderColor}` : "none" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 4 }}>{item.q}</div>
                  <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: dark ? "#0d1628ee" : "#ffffffee", backdropFilter: "blur(12px)", borderTop: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", zIndex: 100 }}>
        {[
          { label: "Market", href: "/", icon: "📊" },
          { label: "Positions", href: "/positions", icon: "🏦" },
          { label: "Alerts", href: "/alerts", icon: "🔔", active: true },
        ].map((tab) => (
          <a key={tab.label} href={tab.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", color: tab.active ? COLORS.accent : textSecondary, fontSize: 11, fontWeight: tab.active ? 700 : 400, minWidth: 60 }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </a>
        ))}
      </nav>

      <div style={{ textAlign: "center", padding: "8px 20px 100px", fontSize: 12, color: textSecondary }}>
        Not financial advice. <a href="/terms" style={{ color: textSecondary }}>Terms</a> · <a href="/privacy" style={{ color: textSecondary }}>Privacy</a> · LiquidLens v1.0
      </div>
    </div>
  );
}

