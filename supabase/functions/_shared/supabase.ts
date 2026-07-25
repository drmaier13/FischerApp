import { createClient } from "npm:@supabase/supabase-js@2.110.7";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secret) {
    throw new Error("Die Supabase-Serverkonfiguration fehlt.");
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function authenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new Error("Bitte zuerst anmelden.");
  }

  const token = authorization.slice(7);
  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Die Anmeldung ist nicht mehr gültig.");
  }

  return { supabase, user: data.user };
}

export function requireAdmin(email?: string | null) {
  const admins = (Deno.env.get("ADMIN_EMAILS") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !admins.includes(email.toLowerCase())) {
    throw new Error("Für diesen Bereich fehlen die Verwaltungsrechte.");
  }
}

