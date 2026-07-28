import { authenticatedUser, requireAdmin } from "../_shared/supabase.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.7";

function createReadableCode(prefix = "FISCH") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(12));
  const random = [...values].map((value) => alphabet[value % alphabet.length]).join("");
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function findUserByEmail(supabase: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < 100) break;
  }
  return null;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

async function listData(supabase: SupabaseClient) {
  const { data: authData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const [
    { data: accessRows, error: accessError },
    { data: codes, error: codesError },
    { data: learningRows, error: learningError },
    { data: examRows, error: examError },
    { data: trialRows, error: trialError },
  ] = await Promise.all([
    supabase.from("user_access").select("user_id, starts_at, expires_at, access_type, granted_by, note, revoked_at, updated_at"),
    supabase.from("access_codes").select("id, label, duration_days, max_redemptions, redemption_count, valid_from, valid_until, is_active, note, created_at").order("created_at", { ascending: false }),
    supabase.from("learning_states").select("user_id, learning_state, updated_at"),
    supabase.from("exam_attempts").select("user_id, completed_at, duration_seconds, total_correct, total_questions, passed"),
    supabase.from("trial_usage").select("user_id, answered_count, started_at, updated_at"),
  ]);
  if (accessError) throw accessError;
  if (codesError) throw codesError;
  if (learningError) throw learningError;
  if (examError) throw examError;
  if (trialError) throw trialError;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const activeLearners = new Set<string>();
  const questionTotals = new Map<string, {
    attempts: number;
    correct: number;
    learners: Set<string>;
  }>();
  let totalAnswers = 0;
  let correctAnswers = 0;

  for (const row of learningRows || []) {
    if (new Date(row.updated_at).getTime() >= thirtyDaysAgo) activeLearners.add(row.user_id);
    const progress = row.learning_state?.progress;
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) continue;

    for (const [questionId, item] of Object.entries(progress)) {
      if (!item || typeof item !== "object") continue;
      const attempts = Math.max(0, Number((item as { attempts?: unknown }).attempts) || 0);
      const correct = Math.max(0, Math.min(attempts, Number((item as { correct?: unknown }).correct) || 0));
      if (attempts === 0) continue;

      const aggregate = questionTotals.get(questionId) || {
        attempts: 0,
        correct: 0,
        learners: new Set<string>(),
      };
      aggregate.attempts += attempts;
      aggregate.correct += correct;
      aggregate.learners.add(row.user_id);
      questionTotals.set(questionId, aggregate);
      totalAnswers += attempts;
      correctAnswers += correct;
    }
  }

  let examCorrect = 0;
  let examQuestions = 0;
  let examDuration = 0;
  for (const row of examRows || []) {
    if (new Date(row.completed_at).getTime() >= thirtyDaysAgo) activeLearners.add(row.user_id);
    examCorrect += Number(row.total_correct) || 0;
    examQuestions += Number(row.total_questions) || 0;
    examDuration += Number(row.duration_seconds) || 0;
  }

  const examsPassed = (examRows || []).filter((row) => row.passed).length;
  const activeAccesses = (accessRows || []).filter((row) =>
    !row.revoked_at && new Date(row.expires_at).getTime() > now
  ).length;
  const questionPerformance = [...questionTotals.entries()]
    .map(([id, values]) => ({
      id,
      attempts: values.attempts,
      correct: values.correct,
      wrong: values.attempts - values.correct,
      learners: values.learners.size,
      errorRate: percent(values.attempts - values.correct, values.attempts),
    }))
    .sort((a, b) => b.wrong - a.wrong || b.errorRate - a.errorRate || b.attempts - a.attempts);

  const accessByUser = new Map((accessRows || []).map((row) => [row.user_id, row]));
  return {
    users: authData.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || "",
      createdAt: user.created_at,
      confirmedAt: user.email_confirmed_at,
      access: accessByUser.get(user.id) || null,
    })),
    codes: codes || [],
    statistics: {
      summary: {
        totalAccounts: authData.users.length,
        confirmedAccounts: authData.users.filter((user) => user.email_confirmed_at).length,
        activeAccesses,
        recentRegistrations: authData.users.filter((user) => new Date(user.created_at).getTime() >= sevenDaysAgo).length,
        learningUsers: (learningRows || []).length,
        activeLearners30: activeLearners.size,
        totalAnswers,
        correctAnswers,
        wrongAnswers: totalAnswers - correctAnswers,
        accuracy: percent(correctAnswers, totalAnswers),
        trialUsers: (trialRows || []).length,
        trialAnswers: (trialRows || []).reduce((sum, row) => sum + (Number(row.answered_count) || 0), 0),
        trialCompleted: (trialRows || []).filter((row) => Number(row.answered_count) >= 100).length,
        examsTotal: (examRows || []).length,
        examsPassed,
        examPassRate: percent(examsPassed, (examRows || []).length),
        examAveragePercent: percent(examCorrect, examQuestions),
        examAverageMinutes: (examRows || []).length > 0
          ? Math.round(examDuration / (examRows || []).length / 60)
          : 0,
      },
      questionPerformance,
      generatedAt: new Date().toISOString(),
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Methode nicht erlaubt." }, 405);
  }

  try {
    const { supabase, user } = await authenticatedUser(request);
    requireAdmin(user.email);
    const body = await request.json().catch(() => ({}));

    if (body.action === "list") {
      return json(await listData(supabase));
    }

    if (body.action === "grant") {
      const target = await findUserByEmail(supabase, body.email || "");
      if (!target) return json({ error: "Zu dieser E-Mail-Adresse wurde kein Lernkonto gefunden." }, 404);
      const days = Math.max(1, Math.min(3660, Number(body.days) || 365));
      const reference = `complimentary:${crypto.randomUUID()}`;
      const { data, error } = await supabase.rpc("grant_user_access", {
        p_user_id: target.id,
        p_duration_days: days,
        p_access_type: "complimentary",
        p_source_reference: reference,
        p_granted_by: user.email,
        p_note: String(body.note || "Kostenlose Freischaltung").slice(0, 500),
      });
      if (error) throw error;
      return json({ expiresAt: data });
    }

    if (body.action === "revoke") {
      const target = await findUserByEmail(supabase, body.email || "");
      if (!target) return json({ error: "Zu dieser E-Mail-Adresse wurde kein Lernkonto gefunden." }, 404);
      const { error } = await supabase.from("user_access").update({
        revoked_at: new Date().toISOString(),
        note: String(body.note || "Zugang durch Verwaltung gesperrt").slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("user_id", target.id);
      if (error) throw error;
      return json({ revoked: true });
    }

    if (body.action === "create_code") {
      const label = String(body.label || "").trim();
      if (!label) return json({ error: "Bitte eine Bezeichnung für den Code angeben." }, 422);
      const prefix = String(body.prefix || "FISCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "FISCH";
      const code = createReadableCode(prefix);
      const { data, error } = await supabase.from("access_codes").insert({
        code_hash: await sha256(code),
        label,
        duration_days: Math.max(1, Math.min(3660, Number(body.days) || 365)),
        max_redemptions: Math.max(1, Math.min(10000, Number(body.maxRedemptions) || 1)),
        valid_until: body.validUntil || null,
        created_by: user.email,
        note: String(body.note || "").slice(0, 500) || null,
      }).select("id").single();
      if (error) throw error;
      return json({ id: data.id, code });
    }

    if (body.action === "toggle_code") {
      const { error } = await supabase.from("access_codes").update({
        is_active: Boolean(body.isActive),
        updated_at: new Date().toISOString(),
      }).eq("id", body.id);
      if (error) throw error;
      return json({ updated: true });
    }

    return json({ error: "Unbekannte Verwaltungsaktion." }, 400);
  } catch (error) {
    const status = error instanceof Error && /Verwaltungsrechte|anmelden|Anmeldung/.test(error.message) ? 403 : 500;
    return errorResponse(error, status);
  }
});
