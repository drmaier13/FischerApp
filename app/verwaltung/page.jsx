"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appPath } from "@/lib/app-path";

function formatDate(value) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function accessState(access) {
  if (!access) return { label: "Nicht freigeschaltet", tone: "pending" };
  if (access.revoked_at) return { label: "Gesperrt", tone: "revoked" };
  if (new Date(access.expires_at).getTime() <= Date.now()) return { label: "Abgelaufen", tone: "expired" };
  return { label: `Aktiv bis ${formatDate(access.expires_at)}`, tone: "active" };
}

async function adminAction(body) {
  const { data, error } = await supabase.functions.invoke("access-admin", { body });
  if (error || data?.error) {
    throw new Error(data?.error || "Die Verwaltungsaktion konnte nicht ausgeführt werden.");
  }
  return data;
}

export default function VerwaltungPage() {
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [data, setData] = useState({ users: [], codes: [] });
  const [search, setSearch] = useState("");
  const [grant, setGrant] = useState({ email: "", days: 365, note: "Kostenlose Freischaltung" });
  const [codeForm, setCodeForm] = useState({ label: "", prefix: "FISCH", days: 365, maxRedemptions: 1, validUntil: "", note: "" });
  const [createdCode, setCreatedCode] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      setData(await adminAction({ action: "list" }));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: result }) => setSession(result.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data.users;
    return data.users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term));
  }, [data.users, search]);

  async function login(event) {
    event.preventDefault();
    setBusy("login");
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (loginError) {
      setError("E-Mail-Adresse oder Passwort stimmen nicht.");
      setBusy("");
    }
  }

  async function run(action, successMessage) {
    setBusy(action.action);
    setError("");
    setNotice("");
    try {
      const result = await adminAction(action);
      setNotice(successMessage);
      await load();
      return result;
    } catch (caught) {
      setError(caught.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function grantAccess(event) {
    event.preventDefault();
    await run({ action: "grant", ...grant }, "Der kostenlose Zugang wurde freigeschaltet.");
  }

  async function createCode(event) {
    event.preventDefault();
    setCreatedCode("");
    const result = await run({
      action: "create_code",
      ...codeForm,
      validUntil: codeForm.validUntil ? new Date(`${codeForm.validUntil}T23:59:59`).toISOString() : null,
    }, "Der Freischaltcode wurde erstellt. Bitte jetzt sicher kopieren.");
    if (result?.code) setCreatedCode(result.code);
  }

  if (!session) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <a href={appPath("/")} className="admin-back">← Zur PrüfungsApp</a>
          <span className="eyebrow">Geschützter Bereich</span>
          <h1>Zugänge verwalten</h1>
          <p>Melde dich mit dem als Verwaltung hinterlegten Konto an.</p>
          <form onSubmit={login}>
            <label>E-Mail-Adresse
              <input type="email" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} />
            </label>
            <label>Passwort
              <input type="password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button full-button" disabled={busy === "login"} type="submit">{busy === "login" ? "Anmeldung wird geprüft …" : "Anmelden"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Angelschule Bayern</span>
          <h1>Zugangsverwaltung</h1>
          <p>Kostenlose Freigaben, Aktionscodes und Laufzeiten zentral verwalten.</p>
        </div>
        <div className="admin-header-actions">
          <a href={appPath("/")}>Zur App</a>
          <button type="button" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </header>

      {(error || notice) && <div className={error ? "form-error admin-message" : "form-notice admin-message"}>{error || notice}</div>}

      <section className="admin-action-grid">
        <form className="admin-card" onSubmit={grantAccess}>
          <span className="access-badge access-badge--mint">Einzelzugang</span>
          <h2>Kostenlos freischalten</h2>
          <label>E-Mail des Lernkontos
            <input type="email" required value={grant.email} onChange={(event) => setGrant({ ...grant, email: event.target.value })} placeholder="kunde@beispiel.de" />
          </label>
          <div className="admin-form-row">
            <label>Dauer in Tagen
              <input type="number" min="1" max="3660" required value={grant.days} onChange={(event) => setGrant({ ...grant, days: Number(event.target.value) })} />
            </label>
            <label>Interner Grund
              <input value={grant.note} onChange={(event) => setGrant({ ...grant, note: event.target.value })} />
            </label>
          </div>
          <button className="primary-button" disabled={Boolean(busy)} type="submit">Zugang freischalten</button>
        </form>

        <form className="admin-card" onSubmit={createCode}>
          <span className="access-badge">Gruppen und Aktionen</span>
          <h2>Freischaltcode erstellen</h2>
          <div className="admin-form-row">
            <label>Bezeichnung
              <input required value={codeForm.label} onChange={(event) => setCodeForm({ ...codeForm, label: event.target.value })} placeholder="Vorbereitungskurs Juli" />
            </label>
            <label>Code-Präfix
              <input required value={codeForm.prefix} onChange={(event) => setCodeForm({ ...codeForm, prefix: event.target.value.toUpperCase() })} />
            </label>
          </div>
          <div className="admin-form-row admin-form-row--three">
            <label>Dauer
              <input type="number" min="1" max="3660" value={codeForm.days} onChange={(event) => setCodeForm({ ...codeForm, days: Number(event.target.value) })} />
            </label>
            <label>Einlösungen
              <input type="number" min="1" max="10000" value={codeForm.maxRedemptions} onChange={(event) => setCodeForm({ ...codeForm, maxRedemptions: Number(event.target.value) })} />
            </label>
            <label>Einlösbar bis
              <input type="date" value={codeForm.validUntil} onChange={(event) => setCodeForm({ ...codeForm, validUntil: event.target.value })} />
            </label>
          </div>
          <button className="primary-button" disabled={Boolean(busy)} type="submit">Code erzeugen</button>
          {createdCode && (
            <div className="created-code">
              <span>Nur jetzt vollständig sichtbar</span>
              <strong>{createdCode}</strong>
              <button type="button" onClick={() => navigator.clipboard.writeText(createdCode)}>Code kopieren</button>
            </div>
          )}
        </form>
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-section-head">
          <div><span className="eyebrow">Lernkonten</span><h2>{data.users.length} Konten</h2></div>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name oder E-Mail suchen" />
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Kunde</th><th>Status</th><th>Art</th><th>Registriert</th><th>Aktion</th></tr></thead>
            <tbody>
              {filteredUsers.map((user) => {
                const state = accessState(user.access);
                return (
                  <tr key={user.id}>
                    <td><strong>{user.name || "Ohne Namen"}</strong><small>{user.email}</small></td>
                    <td><span className={`admin-status admin-status--${state.tone}`}>{state.label}</span></td>
                    <td>{user.access?.access_type || "–"}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button type="button" onClick={() => setGrant({ ...grant, email: user.email || "" })}>Freigeben</button>
                      {user.access && !user.access.revoked_at && <button className="danger-link" type="button" onClick={() => run({ action: "revoke", email: user.email, note: "Manuell gesperrt" }, "Der Zugang wurde gesperrt.")}>Sperren</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-section-head"><div><span className="eyebrow">Freischaltcodes</span><h2>{data.codes.length} Codes</h2></div></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Bezeichnung</th><th>Nutzung</th><th>Dauer</th><th>Einlösbar bis</th><th>Status</th></tr></thead>
            <tbody>
              {data.codes.map((code) => (
                <tr key={code.id}>
                  <td><strong>{code.label}</strong><small>Erstellt am {formatDate(code.created_at)}</small></td>
                  <td>{code.redemption_count} / {code.max_redemptions}</td>
                  <td>{code.duration_days} Tage</td>
                  <td>{formatDate(code.valid_until)}</td>
                  <td><button type="button" onClick={() => run({ action: "toggle_code", id: code.id, isActive: !code.is_active }, code.is_active ? "Der Code wurde deaktiviert." : "Der Code wurde aktiviert.")}>{code.is_active ? "Aktiv" : "Deaktiviert"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
