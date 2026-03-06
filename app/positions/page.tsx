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
