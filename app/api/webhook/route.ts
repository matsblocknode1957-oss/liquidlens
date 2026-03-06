import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const wallet = session.metadata?.wallet_address ?? null;
      const threshold = parseFloat(session.metadata?.health_factor_threshold ?? "1.5");

      if (!email) break;

      const { error } = await supabase.from("subscribers").upsert(
        {
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          wallet_address: wallet,
          health_factor_threshold: threshold,
          status: "active",
        },
        { onConflict: "email" }
      );

      if (error) console.error("Supabase upsert error:", error);
      else console.log(`Subscriber activated: ${email}`);
      break;
    }

    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const customerId = "customer" in obj ? (obj.customer as string) : undefined;
      if (!customerId) break;

      const { error } = await supabase
        .from("subscribers")
        .update({ status: "inactive" })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("Supabase deactivate error:", error);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      if (!customerId) break;

      const { error } = await supabase
        .from("subscribers")
        .update({ status: "active" })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("Supabase renewal error:", error);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
