import { supabase } from "@/lib/supabase";

const LEARNING_TABLE = "learning_states";
const ACCESS_TABLE = "user_access";
const EXAM_TABLE = "exam_attempts";

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

function fallbackAccessPeriod(user) {
  const startsAt = user?.email_confirmed_at || user?.created_at || new Date().toISOString();
  const expiresAt = new Date(startsAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  return { starts_at: startsAt, expires_at: expiresAt.toISOString() };
}

function accountFromUser(user, access) {
  if (!user) return null;
  const email = user.email || "";
  const period = access || fallbackAccessPeriod(user);
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name?.trim() || email.split("@")[0] || "Angler",
    accessStartsAt: period.starts_at,
    accessExpiresAt: period.expires_at,
    accessExpired: new Date(period.expires_at).getTime() <= Date.now(),
  };
}

async function accountWithAccess(user) {
  if (!user) return null;
  const { data, error } = await supabase
    .from(ACCESS_TABLE)
    .select("starts_at, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Die Zugangsfreigabe konnte nicht geprüft werden.");
  return accountFromUser(user, data || fallbackAccessPeriod(user));
}

function friendlyAuthError(error) {
  const message = error?.message || "";
  if (/invalid login credentials/i.test(message)) return "E-Mail-Adresse oder Passwort stimmen nicht.";
  if (/email not confirmed/i.test(message)) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (/already registered|already been registered/i.test(message)) return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
  if (/password/i.test(message) && /characters|length|weak/i.test(message)) return "Bitte wähle ein stärkeres Passwort mit mindestens 8 Zeichen.";
  if (/rate limit/i.test(message)) return "Bitte warte kurz und versuche es anschließend erneut.";
  return message || "Das hat leider nicht geklappt.";
}

export async function currentAccount() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(friendlyAuthError(error));
  return accountWithAccess(data.session?.user);
}

export function subscribeToAccount(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      accountWithAccess(session?.user)
        .then(callback)
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

export async function logoutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(friendlyAuthError(error));
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
