import { authenticatedUser } from "../_shared/supabase.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

const TERMS_VERSION = "2026-07-24";
const CHECKOUT_ATTEMPT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Methode nicht erlaubt." }, 405);
  }

  try {
    const { supabase, user } = await authenticatedUser(request);
    const payload = await request.json().catch(() => ({}));

    if (payload.acceptedImmediateDelivery !== true) {
      return json({
        error: "Bitte bestätige den sofortigen Beginn des Jahreszugangs und die Hinweise zum Widerrufsrecht.",
      }, 422);
    }

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const stripePriceId = Deno.env.get("STRIPE_PRICE_ID");
    const stripeTaxRateId = Deno.env.get("STRIPE_TAX_RATE_ID");
    const appUrl = (Deno.env.get("APP_URL") || "https://angelschule.bayern/app").replace(/\/$/, "");

    if (!stripeSecret || !stripePriceId) {
      return json({ error: "Die Online-Zahlung wird gerade eingerichtet. Bitte versuche es später erneut." }, 503);
    }

    const consentAcceptedAt = new Date().toISOString();
    const checkoutAttemptId = CHECKOUT_ATTEMPT_PATTERN.test(String(payload.checkoutAttemptId || ""))
      ? String(payload.checkoutAttemptId)
      : crypto.randomUUID();
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("line_items[0][price]", stripePriceId);
    body.set("line_items[0][quantity]", "1");
    if (stripeTaxRateId) {
      body.set("line_items[0][tax_rates][0]", stripeTaxRateId);
    }
    body.set("client_reference_id", user.id);
    body.set("customer_email", user.email || "");
    body.set("customer_creation", "always");
    body.set("success_url", `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", `${appUrl}/?payment=cancelled`);
    body.set("invoice_creation[enabled]", "true");
    body.set("invoice_creation[invoice_data][description]", "Angelschule Bayern – PrüfungsApp · Jahreszugang");
    body.set("invoice_creation[invoice_data][footer]", "365 Tage Zugang · keine automatische Verlängerung");
    body.set("metadata[supabase_user_id]", user.id);
    body.set("metadata[access_days]", "365");
    body.set("metadata[terms_version]", TERMS_VERSION);
    body.set("metadata[consent_accepted_at]", consentAcceptedAt);
    body.set("metadata[checkout_attempt_id]", checkoutAttemptId);
    body.set("payment_intent_data[metadata][supabase_user_id]", user.id);
    body.set("payment_intent_data[description]", "PrüfungsApp Jahreszugang");
    body.set("locale", "de");

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `checkout-${checkoutAttemptId}`,
      },
      body,
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session.url || !session.id) {
      console.error("Stripe Checkout konnte nicht erstellt werden:", session?.error?.message || stripeResponse.status);
      return json({ error: "Das Bezahlfenster konnte gerade nicht geöffnet werden." }, 502);
    }

    const { error: orderError } = await supabase.from("payment_orders").upsert({
      user_id: user.id,
      checkout_attempt_id: checkoutAttemptId,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status || "unpaid",
      consent_terms_version: TERMS_VERSION,
      consent_accepted_at: consentAcceptedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_checkout_session_id" });

    if (orderError) {
      console.error("Bestellvorgang konnte nicht vorgemerkt werden:", orderError.message);
    }

    return json({ url: session.url });
  } catch (error) {
    return errorResponse(error, 401);
  }
});
