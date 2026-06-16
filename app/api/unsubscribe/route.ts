import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function page(title: string, heading: string, body: string, isError = false) {
  const accentColor = isError ? "#ef4444" : "#10b981";
  const icon = isError ? "✕" : "✓";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — LiquidLens</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0e1a;
      color: #f9fafb;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #0d1628;
      border: 1px solid #1e2a40;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
    }
    .logo { font-size: 22px; font-weight: 800; margin-bottom: 32px; color: #f9fafb; }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${accentColor}20;
      border: 1px solid ${accentColor}40;
      color: ${accentColor};
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    p { font-size: 14px; color: #9ca3af; line-height: 1.6; }
    .back {
      display: inline-block;
      margin-top: 28px;
      padding: 12px 24px;
      background: #1e2a40;
      color: #f9fafb;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">💧 LiquidLens</div>
    <div class="icon">${icon}</div>
    <h1>${heading}</h1>
    <p>${body}</p>
    <a class="back" href="https://liquidlens.uk">Back to LiquidLens</a>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      page("Error", "Invalid link", "This unsubscribe link is missing its token. Please use the link from your alert email.", true),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("subscribers")
    .update({ alerts_enabled: false })
    .eq("unsubscribe_token", token)
    .select("email")
    .single();

  if (error || !data) {
    return new NextResponse(
      page("Error", "Link not found", "This unsubscribe link is invalid or has already been used. If you keep receiving emails, please contact us at alerts@fintechcheck.uk.", true),
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    page(
      "Unsubscribed",
      "You've been unsubscribed",
      `Alert emails for <strong style="color:#f9fafb;">${data.email}</strong> have been disabled. Your subscription remains active — you can re-enable alerts from your account settings.`
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
