import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

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

async function fetchChainlinkEthPrice(): Promise<number | null> {
  try {
    const CHAINLINK_ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const rpcUrl = process.env.ALCHEMY_RPC_URL ?? "https://ethereum.publicnode.com";
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_call",
        params: [{ to: CHAINLINK_ETH_USD, data: "0xfeaf968c" }, "latest"],
      }),
    });
    const json = await res.json();
    const result = json.result;
    if (!result || result === "0x") return null;
    const hex = result.replace("0x", "");
    // latestRoundData: roundId, answer, startedAt, updatedAt, answeredInRound
    const answer = BigInt("0x" + hex.slice(64, 128));
    return Number(answer) / 1e8;
  } catch (err) {
    console.error("Chainlink ETH/USD fetch failed:", err);
    return null;
  }
}

async function fetchAavePosition(wallet: string): Promise<PositionResult | null> {
  try {
    const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
    const paddedWallet = wallet.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = "0xbf92857c" + paddedWallet;

    const res = await fetch("https://ethereum.publicnode.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_call",
        params: [{ to: AAVE_POOL, data }, "latest"],
      }),
    });

    const json = await res.json();
    const result = json.result;
    if (!result || result === "0x") return null;

    const hex = result.replace("0x", "");
    const chunk = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));

    const collateralUSD = Number(chunk(0)) / 1e8;
    const debtUSD = Number(chunk(1)) / 1e8;
    const healthFactor = Number(chunk(5)) / 1e18;

    if (debtUSD === 0 || healthFactor > 1000 || isNaN(healthFactor)) return null;

    return {
      protocol: "Aave v3",
      healthFactor,
      collateralUSD,
      debtUSD,
    };
  } catch (err) {
    console.error(`Aave fetch failed for ${wallet}:`, err);
    return null;
  }
}

async function fetchMakerPosition(wallet: string, ethPriceUSD: number | null): Promise<PositionResult | null> {
  try {
    const MAKER_CDP_MANAGER  = "0x5ef30b9986345249bc32d8928B7ee64DE9435E39";
    const MAKER_GET_CDPS     = "0x36a724Bd100c39f0Ea4D3A20F7097eE01a8fF573";
    const MAKER_VAT          = "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B";
    const MAKER_PROXY_REG    = "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4";
    const rpcUrl = process.env.ALCHEMY_RPC_URL ?? "https://ethereum.publicnode.com";

    const rpc = async (to: string, data: string) => {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
      });
      const json = await res.json();
      return json.result as string | null;
    };

    const paddedWallet  = wallet.toLowerCase().replace("0x", "").padStart(64, "0");
    const paddedManager = MAKER_CDP_MANAGER.replace("0x", "").padStart(64, "0");

    // Resolve DSProxy; also try the wallet address directly for users without a proxy.
    const proxyRaw = await rpc(MAKER_PROXY_REG, "0xc4552791" + paddedWallet);
    const zeroAddr = "0x" + "0".repeat(40);
    const proxyAddr = proxyRaw && proxyRaw !== "0x" ? "0x" + proxyRaw.slice(-40) : null;
    const candidates = [...new Set(
      [proxyAddr, wallet].filter((a): a is string => !!a && a !== zeroAddr)
    )];

    let cdpsRaw: string | null = null;
    for (const addr of candidates) {
      const padded = addr.replace("0x", "").padStart(64, "0");
      const r = await rpc(MAKER_GET_CDPS, "0x1ce03f38" + paddedManager + padded);
      if (r && r !== "0x" && r.length > 2) { cdpsRaw = r; break; }
    }
    if (!cdpsRaw) return null;

    // Decode (uint256[], address[], bytes32[]) ABI tuple.
    const hex = cdpsRaw.replace("0x", "");
    const wordN = (i: number) => Number(BigInt("0x" + hex.slice(i * 64, (i + 1) * 64)));
    const off1 = wordN(0) / 32, off2 = wordN(1) / 32, off3 = wordN(2) / 32;
    const len = wordN(off1);
    if (len === 0) return null;

    const cdps: Array<{ urn: string; ilk: string }> = [];
    for (let i = 0; i < len; i++) {
      const urnWord = off2 + 1 + i;
      const ilkWord = off3 + 1 + i;
      const urn = "0x" + hex.slice(urnWord * 64 + 24, urnWord * 64 + 64);
      const ilkHex = hex.slice(ilkWord * 64, ilkWord * 64 + 64);
      let ilkStr = "";
      for (let j = 0; j < ilkHex.length; j += 2) {
        const b = parseInt(ilkHex.slice(j, j + 2), 16);
        if (!b) break;
        ilkStr += String.fromCharCode(b);
      }
      if (ilkStr.startsWith("ETH")) cdps.push({ urn, ilk: ilkHex });
    }
    if (cdps.length === 0) return null;

    const ethPrice = ethPriceUSD ?? 3000;

    const resolved = await Promise.all(cdps.map(async ({ urn, ilk }) => {
      const paddedUrn = urn.replace("0x", "").padStart(64, "0");
      const [urnData, ilkData] = await Promise.all([
        rpc(MAKER_VAT, "0x2424be5c" + ilk + paddedUrn),
        rpc(MAKER_VAT, "0xd9638d36" + ilk),
      ]);
      if (!urnData || urnData === "0x" || !ilkData || ilkData === "0x") return null;

      const urnHex = urnData.replace("0x", "");
      const inkBig = BigInt("0x" + urnHex.slice(0, 64));
      const artBig = BigInt("0x" + urnHex.slice(64, 128));
      if (artBig === 0n) return null;

      const ilkHex2 = ilkData.replace("0x", "");
      const rateBig = BigInt("0x" + ilkHex2.slice(64, 128));
      const spotBig = BigInt("0x" + ilkHex2.slice(128, 192));

      const inkEth  = Number(inkBig) / 1e18;
      const debtDai = Number(artBig * rateBig / (10n ** 27n)) / 1e18;
      const spotUsd = Number(spotBig) / 1e27;
      if (debtDai === 0 || inkEth === 0 || spotUsd === 0) return null;

      return {
        healthFactor: (inkEth * spotUsd) / debtDai,
        collateralUSD: Math.round(inkEth * ethPrice),
        debtUSD: Math.round(debtDai),
      };
    }));

    const valid = resolved.filter((p): p is NonNullable<typeof p> => p !== null);
    if (valid.length === 0) return null;

    const worst = valid.reduce((a, b) => a.healthFactor < b.healthFactor ? a : b);
    if (!isFinite(worst.healthFactor) || isNaN(worst.healthFactor) || worst.healthFactor <= 0) return null;

    return { protocol: "MakerDAO", ...worst };
  } catch (err) {
    console.error(`Maker fetch failed for ${wallet}:`, err);
    return null;
  }
}

async function fetchCompoundPosition(wallet: string): Promise<PositionResult | null> {
  try {
    const COMPOUND_COMET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
    const rpcUrl = process.env.ALCHEMY_RPC_URL ?? "https://ethereum.publicnode.com";
    const paddedWallet = wallet.toLowerCase().replace("0x", "").padStart(64, "0");

    // borrowBalanceOf(address) = 0x374c49b4  — returns actual debt (0 for non-borrowers)
    // getBorrowLiquidity(address) = 0x5e96c5ce — returns int256: remaining borrow capacity
    //   healthFactor = (debt + liquidity) / debt  (liquidity < 0 means liquidatable)
    const [borrowRes, liquidityRes] = await Promise.all([
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "eth_call",
          params: [{ to: COMPOUND_COMET, data: "0x374c49b4" + paddedWallet }, "latest"],
        }),
      }),
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "eth_call",
          params: [{ to: COMPOUND_COMET, data: "0x5e96c5ce" + paddedWallet }, "latest"],
        }),
      }),
    ]);

    const [borrowJson, liquidityJson] = await Promise.all([borrowRes.json(), liquidityRes.json()]);

    const debtUSD = Number(BigInt(borrowJson.result || "0x0")) / 1e6;
    if (debtUSD === 0) return null;

    let healthFactor = 1.5; // fallback if liquidity call unavailable
    const liqResult = liquidityJson.result;
    if (liqResult && liqResult !== "0x") {
      // int256 two's complement: values above MAX_INT256 are negative
      const raw = BigInt(liqResult);
      const TWO_256 = BigInt("0x10000000000000000000000000000000000000000000000000000000000000000");
      const signed = raw > TWO_256 / 2n - 1n ? raw - TWO_256 : raw;
      const liquidityUSD = Number(signed) / 1e6;
      healthFactor = (debtUSD + liquidityUSD) / debtUSD;
    }

    if (!isFinite(healthFactor) || isNaN(healthFactor) || healthFactor <= 0) return null;

    return {
      protocol: "Compound v3",
      healthFactor,
      collateralUSD: Math.round(debtUSD * healthFactor),
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

async function sendAlertEmail(email: string, wallet: string, positions: PositionResult[], threshold: number, ethPriceUSD: number | null) {
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

  await getResend().emails.send({
    from: "LiquidLens Alerts <alerts@fintechcheck.uk>",
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
          ${ethPriceUSD !== null ? `
          <div style="background:#0d1628;border:1px solid #1e2a40;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;">Chainlink Verified Price</div>
              <div style="font-size:18px;font-weight:800;color:#f9fafb;">ETH/USD $${ethPriceUSD.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <a href="https://chain.link" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:#375BD2;font-size:11px;font-weight:600;color:#ffffff;text-decoration:none;">
              ⬡ Chainlink
            </a>
          </div>` : ""}
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
  const { error } = await getSupabase().from("position_snapshots").insert(rows);
  if (error) console.error("Snapshot save error:", error);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

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

  const ethPriceUSD = await fetchChainlinkEthPrice();

  let alertsSent = 0;
  let positionsChecked = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE) as Subscriber[];
    await Promise.all(
      batch.map(async (sub) => {
        if (!sub.wallet_address) return;
        try {
          const [aavePosition, compoundPosition, makerPosition] = await Promise.all([
            fetchAavePosition(sub.wallet_address),
            fetchCompoundPosition(sub.wallet_address),
            fetchMakerPosition(sub.wallet_address, ethPriceUSD),
          ]);
          const positions = [aavePosition, compoundPosition, makerPosition].filter(Boolean) as PositionResult[];
          positionsChecked++;
          if (positions.length === 0) return;
          await saveSnapshot(sub.wallet_address, positions);
          const atRisk = positions.filter((p) => p.healthFactor < sub.health_factor_threshold);
          if (atRisk.length > 0) {
            await sendAlertEmail(sub.email, sub.wallet_address, atRisk, sub.health_factor_threshold, ethPriceUSD);
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
}