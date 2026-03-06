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

export default function PrivacyPage() {
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
      title: "1. Who We Are",
      content: `LiquidLens (liquidlens.uk) is a DeFi liquidation risk monitoring platform. This Privacy Policy explains how we collect, use, and protect your personal data when you use our service. By using LiquidLens, you agree to the practices described in this policy.`,
    },
    {
      title: "2. Data We Collect",
      content: `We collect the following information when you subscribe to our premium alert service: your email address, your public Ethereum wallet address, your chosen health factor alert threshold, and payment information processed securely by Stripe (we never see or store your card details). When you use the free position monitor, we do not collect or store any data — your wallet address is used only to query public blockchain data in real time and is not retained.`,
    },
    {
      title: "3. Wallet Address Data",
      content: `Your public wallet address is used solely to query on-chain position data from Aave, Compound, and MakerDAO subgraphs on your behalf. This is read-only public data available to anyone on the blockchain. We store your wallet address in our database only if you subscribe to premium alerts, and only to enable position monitoring. We never request, store, or transmit private keys or seed phrases.`,
    },
    {
      title: "4. How We Use Your Data",
      content: `We use your data to: deliver email alerts when your health factor drops below your chosen threshold, manage your subscription via Stripe, communicate service updates or important notices, and improve the platform. We do not sell your data to third parties. We do not use your data for advertising purposes.`,
    },
    {
      title: "5. Position Monitoring",
      content: `As a premium subscriber, your wallet address is checked against Aave and Compound subgraphs approximately every 60 seconds. Position snapshots may be stored in our database to track health factor history and determine when alerts should be sent. This data is associated with your email address and wallet address.`,
    },
    {
      title: "6. Third Party Services",
      content: `We use the following third-party services to operate LiquidLens: Stripe for payment processing (subject to Stripe's Privacy Policy), Resend for email delivery, Supabase for database storage, and The Graph Protocol for blockchain data queries. Each of these services has their own privacy policies governing their use of data.`,
    },
    {
      title: "7. Data Retention",
      content: `We retain your personal data for as long as your subscription is active. If you cancel your subscription, we will delete your email address, wallet address, and position history within 30 days of cancellation. You may request deletion of your data at any time by contacting us at support@liquidlens.uk.`,
    },
    {
      title: "8. Your Rights",
      content: `Under UK GDPR, you have the right to access the personal data we hold about you, request correction of inaccurate data, request deletion of your data, object to processing of your data, and request restriction of processing. To exercise any of these rights, contact us at support@liquidlens.uk. We will respond within 30 days.`,
    },
    {
      title: "9. Data Security",
      content: `We take reasonable measures to protect your data including encrypted database storage via Supabase, secure HTTPS connections, and restricted access to production systems. However, no internet transmission is completely secure and we cannot guarantee absolute security of your data.`,
    },
    {
      title: "10. Cookies",
      content: `LiquidLens uses localStorage (not cookies) to store your dark/light mode preference. This data remains on your device and is not transmitted to our servers. We do not use tracking cookies or advertising cookies.`,
    },
    {
      title: "11. Children's Privacy",
      content: `LiquidLens is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
    },
    {
      title: "12. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of LiquidLens after changes are posted constitutes acceptance of the revised policy.`,
    },
    {
      title: "13. Contact",
      content: `For any privacy-related questions or requests, please contact us at support@liquidlens.uk.`,
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
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Privacy Policy</h1>
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
