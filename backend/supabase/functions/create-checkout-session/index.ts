// Creates a Stripe Checkout session for the signed-in user and returns its URL for a client-side
// redirect. Runs with the Supabase service-role key server-side — the secret Stripe key never
// reaches the browser. Deploy: `supabase functions deploy create-checkout-session`, after setting
// the secrets listed in backend/README.md.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

// Trial-with-card-on-file, 7 days (Section 4). Price IDs come from Stripe once the products are
// created there — see backend/README.md for the exact `stripe` CLI/dashboard steps.
const PRICE_IDS: Record<"monthly" | "annual", string> = {
  monthly: Deno.env.get("STRIPE_PRICE_MONTHLY")!,
  annual: Deno.env.get("STRIPE_PRICE_ANNUAL")!,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not signed in." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan } = (await req.json()) as { plan: "monthly" | "annual" };
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Unknown plan." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse an existing Stripe customer for this user if we already made one.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerId =
      existing?.stripe_customer_id ??
      (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })).id;

    if (!existing) {
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId, status: "none" });
    }

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/welcome?checkout=success`,
      cancel_url: `${origin}/paywall?checkout=canceled`,
      // Sized to the processor's own risk engine (Section 7) — no extra challenge forced here.
      payment_method_collection: "always",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
