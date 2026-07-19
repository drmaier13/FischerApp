const USERS_KEY = "fischerpruefung.users.v1";
const SESSION_KEY = "fischerpruefung.session.v1";

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function derivePassword(password, saltBase64) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const salt = Uint8Array.from(atob(saltBase64), (char) => char.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export function currentAccount() {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const account = readJson(USERS_KEY, []).find((user) => user.id === id);
  return account ? { id: account.id, name: account.name, email: account.email } : null;
}

export async function registerAccount({ name, email, password }) {
  const users = readJson(USERS_KEY, []);
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Für diese E-Mail-Adresse gibt es bereits ein Konto.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(salt);
  const account = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    salt: saltBase64,
    passwordHash: await derivePassword(password, saltBase64),
    createdAt: new Date().toISOString(),
    plan: "test",
  };
  users.push(account);
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, name: account.name, email: account.email };
}

export async function loginAccount({ email, password }) {
  const users = readJson(USERS_KEY, []);
  const account = users.find((user) => user.email === email.trim().toLowerCase());
  if (!account || (await derivePassword(password, account.salt)) !== account.passwordHash) {
    throw new Error("E-Mail-Adresse oder Passwort stimmen nicht.");
  }
  window.localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, name: account.name, email: account.email };
}

export function logoutAccount() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function loadLearningState(accountId) {
  return readJson(`fischerpruefung.learning.${accountId}.v1`, {
    progress: {},
    favorites: [],
    streak: { date: null, days: 0 },
  });
}

export function saveLearningState(accountId, state) {
  window.localStorage.setItem(`fischerpruefung.learning.${accountId}.v1`, JSON.stringify(state));
}
