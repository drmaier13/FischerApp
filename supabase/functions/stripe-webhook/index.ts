import { serviceClient } from "../_shared/supabase.ts";
import { errorResponse, json } from "../_shared/http.ts";

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const values = signatureHeader.split(",").reduce<Record<string, string[]>>((result, entry) => {
    const [key, value] = entry.split("=", 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
  const timestamp = Number(values.t?.[0]);
  const signatures = values.v1 || [];

  if (!timestamp || signatures.length === 0 || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = hex(digest);
  return signatures.some((signature) => constantTimeEqual(expected, signature));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Methode nicht erlaubt." }, 405);
  }

  let event: Record<string, any> | null = null;
  let supabase: ReturnType<typeof serviceClient> | null = null;

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const signature = request.headers.get("stripe-signature");
    const rawBody = await request.text();

    if (!webhookSecret || !signature || !await verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return json({ error: "Ungültige Stripe-Signatur." }, 400);
    }

    event = JSON.parse(rawBody);
    supabase = serviceClient();

    const { error: eventError } = await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
    });

    if (eventError?.code === "23505") {
      return json({ received: true, duplicate: true });
    }
    if (eventError) throw eventError;

    const supportedEvents = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ];
    if (!supportedEvents.includes(event.type)) {
      return json({ received: true });
    }

    const session = event.data?.object;
    const userId = session?.metadata?.supabase_user_id || session?.client_reference_id;
    const paid = session?.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded";

    if (!userId || !paid) {
      if (session?.id && userId) {
        const paymentStatus = event.type === "checkout.session.expired"
          ? "expired"
          : event.type === "checkout.session.async_payment_failed"
          ? "failed"
          : session.payment_status || "unpaid";
        await supabase.from("payment_orders").upsert({
          user_id: userId,
          checkout_attempt_id: session.metadata?.checkout_attempt_id || null,
          stripe_checkout_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          stripe_invoice_id: typeof session.invoice === "string" ? session.invoice : null,
          amount_total: session.amount_total,
          currency: session.currency,
          payment_status: paymentStatus,
          consent_terms_version: session.metadata?.terms_version || null,
          consent_accepted_at: session.metadata?.consent_accepted_at || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_checkout_session_id" });
      }
      return json({ received: true, granted: false });
    }

    const { data: expiresAt, error: grantError } = await supabase.rpc("grant_user_access", {
      p_user_id: userId,
      p_duration_days: 365,
      p_access_type: "paid",
      p_source_reference: session.id,
      p_granted_by: "stripe",
      p_note: "Jahreszugang über Stripe Checkout",
    });
    if (grantError) throw grantError;

    const { error: orderError } = await supabase.from("payment_orders").upsert({
      user_id: userId,
      checkout_attempt_id: session.metadata?.checkout_attempt_id || null,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_invoice_id: typeof session.invoice === "string" ? session.invoice : null,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status || "paid",
      consent_terms_version: session.metadata?.terms_version || null,
      consent_accepted_at: session.metadata?.consent_accepted_at || null,
      paid_at: new Date(event.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_checkout_session_id" });
    if (orderError) throw orderError;

    return json({ received: true, granted: true, expiresAt });
  } catch (error) {
    console.error(error);
    if (event?.id && supabase) {
      await supabase.from("stripe_webhook_events").delete().eq("stripe_event_id", event.id);
    }
    return errorResponse(error, 500);
  }
});
