"use client";

import { useState, useEffect } from "react";

const COLORS = {
  accent: "#3b82f6",
  bg: "#0a0e1a",
  card: "#0d1628",
  border: "#1e2a40",
  textPrimary: "#f9fafb",
  textSecondary: "#6b7280",
};

export default function TermsPage() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("liquidlens-dark");
    if (stored !== null) setDark(stored === "true");
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      localStorage.setItem("liquidlens-dark", String(!d));
      return !d;
    });
  };

  const bg = dark ? COLORS.bg : "#f0f4ff";
  const cardBg = dark ? COLORS.card : "#ffffff";
  const borderColor = dark ? COLORS.border : "#e2e8f0";
  const textPrimary = dark ? COLORS.textPrimary : "#0f172a";
  const textSecondary = dark ? COLORS.textSecondary : "#64748b";

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using LiquidLens (liquidlens.uk), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service. LiquidLens is operated as an independent service and is not affiliated with Aave, Compound, MakerDAO, or any other DeFi protocol.`,
    },
    {
      title: "2. Description of Service",
      content: `LiquidLens is a DeFi liquidation risk monitoring platform. We provide a free dashboard showing protocol-level liquidation data, and a premium subscription service (£4.99/month) that monitors individual wallet positions and sends email alerts when health factors drop below a user-defined threshold. Position data is fetched from public blockchain subgraphs using your provided wallet address. We do not access, control, or interact with your funds in any way.`,
    },
    {
      title: "3. Not Financial Advice",
      content: `LiquidLens provides informational data only. Nothing on this platform constitutes financial, investment, or legal advice. Health factors, liquidation prices, and risk indicators are provided for informational purposes only. You are solely responsible for your own financial decisions. We strongly recommend consulting a qualified financial adviser before making any investment or borrowing decisions.`,
    },
    {
      title: "4. Wallet Address Monitoring",
      content: `To use the position monitoring and alert features, you provide your public Ethereum wallet address. This is read-only — we query public on-chain data only and have no ability to access, move, or interact with your funds. We never ask for private keys, seed phrases, or wallet signatures. You are responsible for ensuring the wallet address you provide is correct.`,
    },
    {
      title: "5. Alert Accuracy",
      content: `While we make every effort to provide timely and accurate alerts, we cannot guarantee that alerts will be delivered before a liquidation event occurs. Alert delivery depends on network conditions, subgraph data availability, email delivery infrastructure, and other factors outside our control. LiquidLens is not liable for any losses arising from missed, delayed, or inaccurate alerts.`,
    },
    {
      title: "6. Premium Subscription",
      content: `Premium subscriptions are billed at £4.99 per month via Stripe. You may cancel at any time through your Stripe billing portal. Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial months. Subscription prices may change with 30 days notice. Continued use after a price change constitutes acceptance of the new price.`,
    },
    {
      title: "7. Data Accuracy",
      content: `Health factors, collateral values, and liquidation prices are sourced from third-party blockchain subgraphs (including The Graph Protocol). We do not guarantee the accuracy, completeness, or timeliness of this data. On-chain data can change rapidly and subgraph data may lag behind real-time blockchain state. Always verify critical position data directly on the relevant protocol.`,
    },
    {
      title: "8. Limitation of Liability",
      content: `To the maximum extent permitted by law, LiquidLens and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the service, including but not limited to financial losses from liquidation events, missed alerts, or reliance on data provided by the platform.`,
    },
    {
      title: "9. Acceptable Use",
      content: `You agree not to use LiquidLens for any unlawful purpose, to attempt to reverse engineer or scrape the platform, to submit false or misleading information, or to interfere with the operation of the service. We reserve the right to suspend or terminate access for violations of these terms.`,
    },
    {
      title: "10. Changes to Terms",
      content: `We may update these Terms of Service from time to time. Changes will be posted on this page with an updated date. Continued use of LiquidLens after changes are posted constitutes acceptance of the revised terms.`,
    },
    {
      title: "11. Governing Law",
      content: `These terms are governed by the laws of England and Wales. Any disputes arising from these terms or your use of LiquidLens shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
    },
    {
      title: "12. Contact",
      content: `If you have any questions about these Terms of Service, please contact us at support@liquidlens.uk.`,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textPrimary, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: dark ? "#0d162880" : "#ffffffcc", backdropFilter: "blur(12px)", borderBottom: `1px solid ${borderColor}`, padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${COLORS.accent}, #60a5fa)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💧</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>LiquidLens</span>
        </a>
        <button onClick={toggleDark} style={{ background: "none", border: `1px solid ${borderColor}`, borderRadius: 8, color: textSecondary, padding: "4px 12px", fontSize: 13, cursor: "pointer" }}>
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 100px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Terms of Service</h1>
          <p style={{ margin: 0, color: textSecondary, fontSize: 14 }}>Last updated: March 2026</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((section) => (
            <div key={section.title} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: textPrimary }}>{section.title}</h2>
              <p style={{ margin: 0, fontSize: 14, color: textSecondary, lineHeight: 1.7 }}>{section.content}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: dark ? "#0d1628ee" : "#ffffffee", backdropFilter: "blur(12px)", borderTop: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", zIndex: 100 }}>
        {[
          { label: "Market", href: "/", icon: "📊" },
          { label: "Positions", href: "/positions", icon: "🏦" },
          { label: "Alerts", href: "/alerts", icon: "🔔" },
        ].map((tab) => (
          <a key={tab.label} href={tab.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", color: textSecondary, fontSize: 11, minWidth: 60 }}>
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