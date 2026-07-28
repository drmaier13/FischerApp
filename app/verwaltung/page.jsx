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

const emptyStatistics = {
  summary: {
    totalAccounts: 0,
    confirmedAccounts: 0,
    activeAccesses: 0,
    recentRegistrations: 0,
    learningUsers: 0,
    activeLearners30: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
    trialUsers: 0,
    trialAnswers: 0,
    trialCompleted: 0,
    examsTotal: 0,
    examsPassed: 0,
    examPassRate: 0,
    examAveragePercent: 0,
    examAverageMinutes: 0,
  },
  questionPerformance: [],
  generatedAt: null,
};

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(Number(value) || 0);
}

export default function VerwaltungPage() {
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [recoveryMode, setRecoveryMode] = useState("login");
  const [newPassword, setNewPassword] = useState({ password: "", repeated: "" });
  const [data, setData] = useState({ users: [], codes: [], statistics: emptyStatistics });
  const [questionCatalog, setQuestionCatalog] = useState([]);
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
    const querySignalsRecovery = new URLSearchParams(window.location.search).get("recovery") === "1";
    const hashSignalsRecovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    if (querySignalsRecovery || hashSignalsRecovery) setRecoveryMode("reset");

    supabase.auth.getSession().then(({ data: result }) => setSession(result.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode("reset");
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && recoveryMode !== "reset") void load();
  }, [session, recoveryMode, load]);

  useEffect(() => {
    fetch(appPath("/data/questions.json"))
      .then((response) => {
        if (!response.ok) throw new Error("Fragenkatalog nicht verfügbar.");
        return response.json();
      })
      .then((catalog) => setQuestionCatalog(catalog.questions || []))
      .catch(() => setQuestionCatalog([]));
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data.users;
    return data.users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term));
  }, [data.users, search]);

  const statistics = data.statistics || emptyStatistics;
  const questionDetails = useMemo(
    () => new Map(questionCatalog.map((question) => [question.id, question])),
    [questionCatalog],
  );
  const topWrongQuestions = useMemo(
    () => (statistics.questionPerformance || [])
      .filter((item) => item.wrong > 0)
      .slice(0, 15)
      .map((item) => ({ ...item, ...questionDetails.get(item.id) })),
    [statistics.questionPerformance, questionDetails],
  );
  const categoryPerformance = useMemo(() => {
    const categories = new Map();
    for (const item of statistics.questionPerformance || []) {
      const category = questionDetails.get(item.id)?.category || "Ohne Zuordnung";
      const current = categories.get(category) || { category, attempts: 0, correct: 0 };
      current.attempts += item.attempts;
      current.correct += item.correct;
      categories.set(category, current);
    }
    return [...categories.values()]
      .map((item) => ({
        ...item,
        accuracy: item.attempts > 0 ? Math.round((item.correct / item.attempts) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
  }, [statistics.questionPerformance, questionDetails]);

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

  async function requestPasswordReset() {
    const email = credentials.email.trim().toLowerCase();
    setError("");
    setNotice("");
    if (!email) {
      setError("Bitte gib zuerst die E-Mail-Adresse des Verwaltungskontos ein.");
      return;
    }

    setBusy("recovery");
    const redirectTo = `${window.location.origin}${appPath("/verwaltung/")}?recovery=1`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (recoveryError) {
      setError("Die Wiederherstellungs-E-Mail konnte gerade nicht versendet werden. Bitte versuche es in einigen Minuten erneut.");
    } else {
      setNotice("Falls für diese E-Mail-Adresse ein Konto besteht, wurde ein Link zum Festlegen eines neuen Passworts versendet.");
    }
    setBusy("");
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!session) {
      setError("Der Wiederherstellungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.");
      return;
    }
    if (newPassword.password.length < 12) {
      setError("Das neue Passwort muss mindestens 12 Zeichen lang sein.");
      return;
    }
    if (newPassword.password !== newPassword.repeated) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setBusy("new-password");
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword.password });
    if (passwordError) {
      setError("Das neue Passwort konnte nicht gespeichert werden. Bitte fordere einen neuen Wiederherstellungslink an.");
      setBusy("");
      return;
    }

    await supabase.auth.signOut();
    window.history.replaceState({}, "", appPath("/verwaltung/"));
    setNewPassword({ password: "", repeated: "" });
    setCredentials((current) => ({ ...current, password: "" }));
    setRecoveryMode("login");
    setNotice("Das Passwort wurde geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.");
    setBusy("");
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

  if (recoveryMode === "reset") {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <a href={appPath("/")} className="admin-back">← Zur PrüfungsApp</a>
          <span className="eyebrow">Sicherer Zugang</span>
          <h1>Neues Passwort festlegen</h1>
          <p>Wähle ein neues Passwort mit mindestens 12 Zeichen. Der Link aus der E-Mail ist nur zeitlich begrenzt gültig.</p>
          <form onSubmit={saveNewPassword}>
            <label>Neues Passwort
              <input type="password" required minLength={12} autoComplete="new-password" value={newPassword.password} onChange={(event) => setNewPassword({ ...newPassword, password: event.target.value })} />
            </label>
            <label>Neues Passwort wiederholen
              <input type="password" required minLength={12} autoComplete="new-password" value={newPassword.repeated} onChange={(event) => setNewPassword({ ...newPassword, repeated: event.target.value })} />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full-button" disabled={busy === "new-password"} type="submit">{busy === "new-password" ? "Passwort wird gespeichert …" : "Neues Passwort speichern"}</button>
            <button className="admin-text-button" type="button" onClick={() => { setRecoveryMode("login"); setError(""); window.history.replaceState({}, "", appPath("/verwaltung/")); }}>Zurück zur Anmeldung</button>
          </form>
        </section>
      </main>
    );
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
            {notice && <div className="form-notice" role="status">{notice}</div>}
            <button className="primary-button full-button" disabled={busy === "login"} type="submit">{busy === "login" ? "Anmeldung wird geprüft …" : "Anmelden"}</button>
            <button className="admin-text-button" disabled={Boolean(busy)} type="button" onClick={requestPasswordReset}>{busy === "recovery" ? "E-Mail wird versendet …" : "Passwort vergessen?"}</button>
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
          <p>Lernentwicklung, Prüfungen, Freigaben und Aktionscodes zentral verwalten.</p>
        </div>
        <div className="admin-header-actions">
          <a href={appPath("/")}>Zur App</a>
          <button type="button" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </header>

      {(error || notice) && <div className={error ? "form-error admin-message" : "form-notice admin-message"}>{error || notice}</div>}

      <section className="admin-statistics">
        <div className="admin-statistics-head">
          <div>
            <span className="eyebrow">Lernstatistik</span>
            <h2>So wird mit der App gelernt</h2>
            <p>Zusammengefasste Werte aller synchronisierten Lernkonten.</p>
          </div>
          <button type="button" disabled={busy === "load"} onClick={load}>
            {busy === "load" ? "Wird aktualisiert …" : "Aktualisieren"}
          </button>
        </div>

        <div className="admin-stat-grid">
          <article className="admin-stat-card">
            <span>Lernkonten</span>
            <strong>{formatNumber(statistics.summary.totalAccounts)}</strong>
            <small>{formatNumber(statistics.summary.recentRegistrations)} neu in 7 Tagen</small>
          </article>
          <article className="admin-stat-card">
            <span>Aktive Zugänge</span>
            <strong>{formatNumber(statistics.summary.activeAccesses)}</strong>
            <small>Bezahlte und kostenlose Freigaben</small>
          </article>
          <article className="admin-stat-card">
            <span>Aktiv gelernt</span>
            <strong>{formatNumber(statistics.summary.activeLearners30)}</strong>
            <small>Konten in den letzten 30 Tagen</small>
          </article>
          <article className="admin-stat-card">
            <span>Beantwortete Fragen</span>
            <strong>{formatNumber(statistics.summary.totalAnswers)}</strong>
            <small>{statistics.summary.accuracy} % richtig beantwortet</small>
          </article>
          <article className="admin-stat-card">
            <span>Prüfungssimulationen</span>
            <strong>{formatNumber(statistics.summary.examsTotal)}</strong>
            <small>{statistics.summary.examPassRate} % bestanden</small>
          </article>
          <article className="admin-stat-card">
            <span>Testkonten</span>
            <strong>{formatNumber(statistics.summary.trialUsers)}</strong>
            <small>{formatNumber(statistics.summary.trialCompleted)} × 100 Fragen ausgeschöpft</small>
          </article>
        </div>

        <div className="admin-stat-layout">
          <article className="admin-card admin-table-card admin-stat-table-card">
            <div className="admin-section-head">
              <div>
                <span className="eyebrow">Fragenanalyse</span>
                <h2>Besonders häufig falsch</h2>
              </div>
            </div>
            {topWrongQuestions.length > 0 ? (
              <div className="admin-table-wrap">
                <table>
                  <thead><tr><th>Frage</th><th>Falsch</th><th>Fehlerquote</th><th>Lernende</th></tr></thead>
                  <tbody>
                    {topWrongQuestions.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.id} · {item.category || "Ohne Zuordnung"}</strong>
                          <small>{item.question || "Fragetext nicht gefunden"}</small>
                        </td>
                        <td>{formatNumber(item.wrong)} von {formatNumber(item.attempts)}</td>
                        <td><span className={`admin-error-rate${item.errorRate >= 50 ? " admin-error-rate--high" : ""}`}>{item.errorRate} %</span></td>
                        <td>{formatNumber(item.learners)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-empty-state">Sobald Lernfortschritte synchronisiert wurden, erscheinen hier die häufigsten Fehler.</p>
            )}
          </article>

          <article className="admin-card admin-category-card">
            <span className="eyebrow">Sachgebiete</span>
            <h2>Trefferquote nach Gebiet</h2>
            {categoryPerformance.length > 0 ? categoryPerformance.map((item) => (
              <div className="admin-category-row" key={item.category}>
                <div>
                  <strong>{item.category}</strong>
                  <span>{formatNumber(item.attempts)} Antworten</span>
                </div>
                <div className="admin-performance-track" aria-label={`${item.accuracy} Prozent richtig`}>
                  <span style={{ width: `${item.accuracy}%` }} />
                </div>
                <b>{item.accuracy} %</b>
              </div>
            )) : <p className="admin-empty-state">Noch keine auswertbaren Antworten vorhanden.</p>}
            <div className="admin-exam-summary">
              <span>Ø Prüfungsergebnis<strong>{statistics.summary.examAveragePercent} %</strong></span>
              <span>Ø Prüfungsdauer<strong>{statistics.summary.examAverageMinutes} Min.</strong></span>
            </div>
          </article>
        </div>
        <p className="admin-stat-note">
          Die Werte entstehen aus gespeicherten Lernständen und abgeschlossenen Prüfungssimulationen. Sehr kleine Stichproben können die Fehlerquote einzelner Fragen verzerren.
        </p>
      </section>

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
