import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
  });
}

export async function POST(request: Request) {
  try {
    const { email, wallet, threshold } = await request.json();

    if (!email) {
  return NextResponse.json(
    { error: "Email is required" },
    { status: 400 }
  );
}

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        wallet_address: wallet,
        health_factor_threshold: String(threshold ?? 1.5),
      },
      subscription_data: {
        metadata: {
          wallet_address: wallet,
          health_factor_threshold: String(threshold ?? 1.5),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/alerts?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/alerts?cancelled=true`,
    });

    console.log("Session URL:", session.url);
console.log("Session ID:", session.id);
return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}