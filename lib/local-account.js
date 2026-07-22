import { supabase } from "@/lib/supabase";

const LEARNING_TABLE = "learning_states";

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

function accountFromUser(user) {
  if (!user) return null;
  const email = user.email || "";
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name?.trim() || email.split("@")[0] || "Angler",
  };
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
  return accountFromUser(data.session?.user);
}

export function subscribeToAccount(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(accountFromUser(session?.user));
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
    account: data.session ? accountFromUser(data.user) : null,
    requiresConfirmation: !data.session,
  };
}

export async function loginAccount({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error));
  return accountFromUser(data.user);
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
