import { supabase } from "@/lib/supabase";
import { appPath } from "@/lib/app-path";

const LEARNING_TABLE = "learning_states";
const ACCESS_TABLE = "user_access";
const EXAM_TABLE = "exam_attempts";
const TRIAL_TABLE = "trial_usage";
const CHECKOUT_ATTEMPT_KEY = "angelschule.checkout.attempt";
export const TRIAL_QUESTION_LIMIT = 100;

function emptyLearningState() {
  return {
    progress: {},
    favorites: [],
    streak: { date: null, days: 0 },
  };
}

function cacheKey(accountId) {
  return `fischerpruefung.learning.${accountId}.v2`;
}

function readCachedLearningState(accountId) {
  try {
    const value = window.localStorage.getItem(cacheKey(accountId));
    return value ? { ...emptyLearningState(), ...JSON.parse(value) } : emptyLearningState();
  } catch {
    return emptyLearningState();
  }
}

function cacheLearningState(accountId, state) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(cacheKey(accountId), JSON.stringify(state));
  }
}

function accountFromUser(user, access, trialUsage) {
  if (!user) return null;
  const email = user.email || "";
  const expiresAt = access?.expires_at || null;
  const revoked = Boolean(access?.revoked_at);
  const expired = Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
  const trialAnsweredCount = Math.max(0, Math.min(TRIAL_QUESTION_LIMIT, Number(trialUsage?.answered_count) || 0));
  const trialRemaining = Math.max(0, TRIAL_QUESTION_LIMIT - trialAnsweredCount);
  const hasAccess = Boolean(expiresAt) && !expired && !revoked;
  const hasTrialAccess = !access && trialRemaining > 0;
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name?.trim() || email.split("@")[0] || "Angler",
    accessStartsAt: access?.starts_at || null,
    accessExpiresAt: expiresAt,
    accessType: access?.access_type || null,
    hasAccess,
    hasTrialAccess,
    trialAnsweredCount,
    trialRemaining,
    trialCompleted: !access && trialRemaining === 0,
    canLearn: hasAccess || hasTrialAccess,
    accessExpired: expired,
    accessRevoked: revoked,
  };
}

async function accountWithAccess(user) {
  if (!user) return null;
  const [accessResult, trialResult] = await Promise.all([
    supabase
      .from(ACCESS_TABLE)
      .select("starts_at, expires_at, access_type, revoked_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from(TRIAL_TABLE)
      .select("answered_count")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (accessResult.error || trialResult.error) {
    throw new Error("Die Zugangsfreigabe konnte nicht geprüft werden.");
  }
  return accountFromUser(user, accessResult.data, trialResult.data);
}

export async function consumeTrialQuestion() {
  const { data, error } = await supabase.rpc("consume_trial_question");
  if (error) throw new Error("Das kostenlose Fragenkontingent konnte gerade nicht geprüft werden.");
  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(result?.is_allowed),
    usedCount: Number(result?.used_count) || 0,
    remainingCount: Number(result?.remaining_count) || 0,
    status: result?.status || "access_required",
  };
}

function friendlyAuthError(error) {
  const rawMessage = error?.message;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (/invalid login credentials/i.test(message)) return "E-Mail-Adresse oder Passwort stimmen nicht.";
  if (/email not confirmed/i.test(message)) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (/already registered|already been registered/i.test(message)) return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
  if (/password/i.test(message) && /characters|length|weak/i.test(message)) return "Bitte wähle ein stärkeres Passwort mit mindestens 8 Zeichen.";
  if (/rate limit/i.test(message)) return "Bitte warte kurz und versuche es anschließend erneut.";
  if (/error sending confirmation email|smtp/i.test(message)) {
    return "Die Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte versuche es in einigen Minuten erneut.";
  }
  if (/timed out|timeout/i.test(message)) {
    return "Der E-Mail-Versand hat zu lange gedauert. Bitte versuche es in einigen Minuten erneut.";
  }
  if (!message || message === "{}" || message === "[object Object]") {
    return "Die Registrierung konnte gerade nicht abgeschlossen werden. Bitte versuche es in einigen Minuten erneut.";
  }
  return message;
}

export async function currentAccount() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(friendlyAuthError(error));
  return accountWithAccess(data.session?.user);
}

export function subscribeToAccount(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => {
      accountWithAccess(session?.user)
        .then((account) => callback(account, event))
        .catch((error) => console.error(error.message));
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function registerAccount({ name, email, password, acceptedTerms }) {
  if (!acceptedTerms) throw new Error("Bitte akzeptiere die AGB und bestätige die Datenschutzerklärung.");
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: name.trim(),
        terms_version: "2026-07-22",
        terms_accepted_at: new Date().toISOString(),
      },
    },
  });
  if (error) throw new Error(friendlyAuthError(error));
  return {
    account: data.session ? await accountWithAccess(data.user) : null,
    requiresConfirmation: !data.session,
  };
}

export async function loginAccount({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error));
  return accountWithAccess(data.user);
}

export async function requestAccountPasswordReset(email) {
  const redirectTo = `${window.location.origin}${appPath("/")}?recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  );
  if (error) throw new Error(friendlyAuthError(error));
}

export async function updateAccountPassword(password) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error("Der Wiederherstellungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendlyAuthError(error));
}

export async function logoutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(friendlyAuthError(error));
}

export async function refreshAccountAccess() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(friendlyAuthError(error));
  return accountWithAccess(data.user);
}

export async function redeemAccessCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (normalized.length < 6) {
    throw new Error("Bitte gib einen gültigen Freischaltcode ein.");
  }

  const { error } = await supabase.rpc("redeem_access_code", {
    p_code: normalized,
  });

  if (error) {
    const message = error.message || "";
    if (/bereits verwendet/i.test(message)) {
      throw new Error("Dieser Freischaltcode wurde für dein Konto bereits verwendet.");
    }
    throw new Error("Der Freischaltcode ist ungültig oder nicht mehr verfügbar.");
  }

  return refreshAccountAccess();
}

export async function startAnnualCheckout({ acceptedImmediateDelivery }) {
  let checkoutAttemptId = window.sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);
  if (!checkoutAttemptId) {
    checkoutAttemptId = window.crypto.randomUUID();
    window.sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, checkoutAttemptId);
  }

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { acceptedImmediateDelivery, checkoutAttemptId },
  });

  if (error || !data?.url) {
    throw new Error(data?.error || "Das Bezahlfenster konnte gerade nicht geöffnet werden.");
  }

  window.location.assign(data.url);
}

export function clearCheckoutAttempt() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
  }
}

export async function loadLearningState(accountId) {
  const cached = readCachedLearningState(accountId);
  const { data, error } = await supabase
    .from(LEARNING_TABLE)
    .select("learning_state")
    .eq("user_id", accountId)
    .maybeSingle();

  if (error) {
    console.error("Lernstand konnte nicht von Supabase geladen werden:", error.message);
    return cached;
  }

  const remote = data?.learning_state;
  const state = remote ? { ...emptyLearningState(), ...remote } : cached;
  cacheLearningState(accountId, state);

  if (!remote && (Object.keys(cached.progress).length || cached.favorites.length)) {
    void saveLearningState(accountId, cached);
  }

  return state;
}

let saveQueue = Promise.resolve();

export function saveLearningState(accountId, state) {
  const snapshot = JSON.parse(JSON.stringify(state));
  cacheLearningState(accountId, snapshot);
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      const { error } = await supabase.from(LEARNING_TABLE).upsert({
        user_id: accountId,
        learning_state: snapshot,
        updated_at: new Date().toISOString(),
      });
      if (error) console.error("Lernstand konnte nicht synchronisiert werden:", error.message);
    });
  return saveQueue;
}

function examAttemptFromRow(row) {
  return {
    id: row.id,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    totalCorrect: row.total_correct,
    totalQuestions: row.total_questions,
    passed: row.passed,
    categoryScores: row.category_scores || {},
  };
}

export async function loadExamHistory(accountId) {
  const { data, error } = await supabase
    .from(EXAM_TABLE)
    .select("id, completed_at, duration_seconds, total_correct, total_questions, passed, category_scores")
    .eq("user_id", accountId)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (error) throw new Error("Die Prüfungshistorie konnte nicht geladen werden.");
  return (data || []).map(examAttemptFromRow);
}

export async function saveExamAttempt(accountId, attempt) {
  const { data, error } = await supabase
    .from(EXAM_TABLE)
    .insert({
      user_id: accountId,
      completed_at: attempt.completedAt,
      duration_seconds: attempt.durationSeconds,
      total_correct: attempt.totalCorrect,
      total_questions: attempt.totalQuestions,
      passed: attempt.passed,
      category_scores: attempt.categoryScores,
    })
    .select("id, completed_at, duration_seconds, total_correct, total_questions, passed, category_scores")
    .single();

  if (error) throw new Error("Das Prüfungsergebnis konnte nicht gespeichert werden.");
  return examAttemptFromRow(data);
}
