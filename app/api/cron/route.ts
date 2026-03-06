import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

const AAVE_ENDPOINT = "https://api.thegraph.com/subgraphs/name/aave/protocol-v3";
const COMPOUND_ENDPOINT = "https://api.thegraph.com/subgraphs/name/messari/compound-v3-ethereum";

interface Subscriber {
  id: string;
  email: string;
  wallet_address: string | null;
  health_factor_threshold: number;
  status: string;
}

interface PositionResult {
  protocol: string;
  healthFactor: number;
  collateralUSD: number;
  debtUSD: number;
}

async function fetchAavePosition(wallet: string): Promise<PositionResult | null> {
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
    const user = json?.data?.users?.[0];
    if (!user) return null;
    const healthFactor = parseFloat(user.healthFactor) / 1e18;
    if (healthFactor > 1000 || isNaN(healthFactor)) return null;
    return {
      protocol: "Aave v3",
      healthFactor,
      collateralUSD: parseFloat(user.totalCollateralUSD),
      debtUSD: parseFloat(user.totalDebtUSD),
    };
  } catch (err) {
    console.error(`Aave fetch failed for ${wallet}:`, err);
    return null;
  }
}

async function fetchCompoundPosition(wallet: string): Promise<PositionResult | null> {
  const query = `
    {
      accounts(where: { id: "${wallet.toLowerCase()}" }) {
        id
        health
        totalBorrowValueInUSD
        totalCollateralValueInUSD
      }
    }
  `;
  try {
    const res = await fetch(COMPOUND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    const account = json?.data?.accounts?.[0];
    if (!account) return null;
    const debtUSD = parseFloat(account.totalBorrowValueInUSD);
    if (debtUSD === 0) return null;
    return {
      protocol: "Compound v3",
      healthFactor: parseFloat(account.health),
      collateralUSD: parseFloat(account.totalCollateralValueInUSD),
      debtUSD,
    };
  } catch (err) {
    console.error(`Compound fetch failed for ${wallet}:`, err);
    return null;
  }
}

function healthLabel(hf: number): string {
  if (hf >= 2.0) return "Safe";
  if (hf >= 1.5) return "Moderate";
  if (hf >= 1.2) return "At Risk";
  return "⚠️ CRITICAL";
}

function healthColor(hf: number): string {
  if (hf >= 2.0) return "#10b981";
  if (hf >= 1.5) return "#f59e0b";
  if (hf >= 1.2) return "#f97316";
  return "#ef4444";
}

async function sendAlertEmail(email: string, wallet: string, positions: PositionResult[], threshold: number) {
  const positionRows = positions.map((p) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a40;">${p.protocol}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a40;color:${healthColor(p.healthFactor)};font-weight:700;">
        ${p.healthFactor.toFixed(3)} — ${healthLabel(p.healthFactor)}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a40;">$${p.collateralUSD.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e2a40;">$${p.debtUSD.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</td>
    </tr>
  `).join("");

  const shortWallet = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const worstHF = Math.min(...positions.map((p) => p.healthFactor));

  await resend.emails.send({
    from: "LiquidLens Alerts <alerts@liquidlens.uk>",
    to: email,
    subject: `⚠️ Alert: Health factor ${worstHF.toFixed(2)} — ${shortWallet}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0a0e1a;font-family:system-ui,sans-serif;color:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
          <div style="margin-bottom:28px;">
            <div style="font-size:24px;font-weight:800;margin-bottom:4px;">💧 LiquidLens</div>
            <div style="font-size:14px;color:#6b7280;">Liquidation risk alert</div>
          </div>
          <div style="background:#ef444420;border:1px solid #ef444440;border-radius:12px;padding:20px;margin-bottom:24px;">
            <div style="font-size:16px;font-weight:700;color:#ef4444;margin-bottom:8px;">⚠️ Health factor below your threshold</div>
            <div style="font-size:14px;color:#f9fafb;line-height:1.6;">
              One or more positions on wallet <strong>${shortWallet}</strong> has dropped below your alert threshold of <strong>${threshold}</strong>.
            </div>
          </div>
          <div style="background:#0d1628;border:1px solid #1e2a40;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#ffffff08;">
                  <th style="padding:10px 16px;text-align:left;color:#6b7280;">Protocol</th>
                  <th style="padding:10px 16px;text-align:left;color:#6b7280;">Health Factor</th>
                  <th style="padding:10px 16px;text-align:left;color:#6b7280;">Collateral</th>
                  <th style="padding:10px 16px;text-align:left;color:#6b7280;">Debt</th>
                </tr>
              </thead>
              <tbody>${positionRows}</tbody>
            </table>
          </div>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="https://liquidlens.uk/positions?wallet=${wallet}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
              View your positions →
            </a>
          </div>
          <div style="font-size:12px;color:#6b7280;text-align:center;border-top:1px solid #1e2a40;padding-top:20px;">
            Not financial advice. · <a href="https://liquidlens.uk/terms" style="color:#6b7280;">Terms</a> · <a href="https://liquidlens.uk/privacy" style="color:#6b7280;">Privacy</a> · LiquidLens v1.0
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

async function saveSnapshot(wallet: string, positions: PositionResult[]) {
  const rows = positions.map((p) => ({
    wallet_address: wallet,
    protocol: p.protocol,
    health_factor: p.healthFactor,
    collateral_usd: p.collateralUSD,
    debt_usd: p.debtUSD,
  }));
  const { error } = await supabase.from("position_snapshots").insert(rows);
  if (error) console.error("Snapshot save error:", error);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscribers, error: subError } = await supabase
    .from("subscribers")
    .select("id, email, wallet_address, health_factor_threshold, status")
    .eq("status", "active")
    .not("wallet_address", "is", null);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: "No active subscribers", checked: 0 });
  }

  let alertsSent = 0;
  let positionsChecked = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE) as Subscriber[];
    await Promise.all(
      batch.map(async (sub) => {
        if (!sub.wallet_address) return;
        try {
          const [aavePosition, compoundPosition] = await Promise.all([
            fetchAavePosition(sub.wallet_address),
            fetchCompoundPosition(sub.wallet_address),
          ]);
          const positions = [aavePosition, compoundPosition].filter(Boolean) as PositionResult[];
          positionsChecked++;
          if (positions.length === 0) return;
          await saveSnapshot(sub.wallet_address, positions);
          const atRisk = positions.filter((p) => p.healthFactor < sub.health_factor_threshold);
          if (atRisk.length > 0) {
            await sendAlertEmail(sub.email, sub.wallet_address, atRisk, sub.health_factor_threshold);
            alertsSent++;
          }
        } catch (err) {
          console.error(`Error processing ${sub.email}:`, err);
        }
      })
    );
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return NextResponse.json({
    success: true,
    checked: positionsChecked,
    alertsSent,
    timestamp: new Date().toISOString(),
  });
