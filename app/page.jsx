"use client";

import { useEffect, useMemo, useState } from "react";
import {
  currentAccount,
  loadLearningState,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveLearningState,
  subscribeToAccount,
} from "@/lib/local-account";
import { appPath } from "@/lib/app-path";

const CORE_CATEGORIES = [
  "Fischkunde",
  "Gewässerkunde",
  "Schutz, Pflege und Hege",
  "Gerätekunde",
  "Rechtskunde",
];

const CATEGORY_ICONS = {
  Fischkunde: "🐟",
  Gewässerkunde: "≈",
  "Schutz, Pflege und Hege": "♧",
  Gerätekunde: "⌁",
  Rechtskunde: "§",
  Bilderfragen: "▧",
};

function FishMark({ small = false }) {
  return (
    <span className={`fish-mark ${small ? "fish-mark--small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 64 46" role="img">
        <path d="M8 23c11-15 29-17 43-5 2 2 4 4 5 5-1 2-3 4-5 5C37 40 19 38 8 23Z" />
        <path d="M8 23 1 10v26L8 23Z" />
        <circle cx="44" cy="20" r="2" />
        <path d="M26 13c2 4 2 8 0 12M34 33c1-4 1-7-1-10" />
      </svg>
    </span>
  );
}

function BrandLockup({ light = false, small = false }) {
  return (
    <div className={`brand ${light ? "brand--light" : ""}`}>
      <FishMark small={small} />
      <span className="brand-copy">Angelschule Bayern <small>– PrüfungsApp</small></span>
    </div>
  );
}

const LEGAL_LINKS = [
  ["Impressum", "/impressum/"],
  ["Datenschutz", "/datenschutz/"],
  ["AGB", "/agb/"],
  ["Widerruf", "/widerruf/"],
  ["Konto löschen", "/konto-loeschen/"],
];

function LegalLinks({ className = "" }) {
  return (
    <nav className={`app-legal-links ${className}`.trim()} aria-label="Rechtliche Informationen">
      {LEGAL_LINKS.map(([label, href]) => <a key={href} href={appPath(href)}>{label}</a>)}
    </nav>
  );
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptedTerms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (form.password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const result = await registerAccount(form);
        if (result.requiresConfirmation) {
          setNotice("Dein Konto wurde angelegt. Bitte bestätige jetzt den Link in der E-Mail und melde dich anschließend an.");
          setMode("login");
          setForm((current) => ({ ...current, password: "" }));
        } else {
          onAuthenticated(result.account);
        }
      } else {
        onAuthenticated(await loginAccount(form));
      }
    } catch (caught) {
      setError(caught.message || "Das hat leider nicht geklappt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual">
        <BrandLockup light />
        <div className="login-copy">
          <span className="eyebrow eyebrow--light">Fischerprüfung Bayern 2026</span>
          <h1>Mit System lernen.<br />Mit Sicherheit bestehen.</h1>
          <p>Alle 1.027 Fragen, verständliche Erklärungen und dein persönlicher Lernstand an einem Ort.</p>
          <div className="visual-stats">
            <span><strong>1.027</strong> Originalfragen</span>
            <span><strong>6</strong> Themenbereiche</span>
            <span><strong>52</strong> Bilderfragen</span>
          </div>
        </div>
        <svg className="water-lines" viewBox="0 0 760 260" aria-hidden="true">
          <path d="M-20 110c90-70 190-70 280 0s190 70 280 0 190-70 280 0" />
          <path d="M-40 170c80-58 175-58 255 0s175 58 255 0 175-58 255 0 175 58 255 0" />
          <path d="M0 225c65-40 145-40 210 0s145 40 210 0 145-40 210 0 145 40 210 0" />
        </svg>
      </section>

      <section className="login-panel">
        <div className="mobile-brand"><BrandLockup small /></div>
        <div className="login-card">
          <span className="eyebrow">Dein Lernkonto</span>
          <h2>{mode === "login" ? "Willkommen zurück" : "Jetzt Lernkonto anlegen"}</h2>
          <p className="muted">{mode === "login" ? "Melde dich an und lerne genau dort weiter, wo du aufgehört hast." : "Dein Fortschritt wird getrennt für dieses Konto gespeichert."}</p>

          <div className="auth-tabs" role="tablist">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setNotice(""); }} type="button">Anmelden</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); setNotice(""); }} type="button">Konto erstellen</button>
          </div>

          <form onSubmit={submit}>
            {mode === "register" && (
              <label>Vorname
                <input required autoComplete="given-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Dein Vorname" />
              </label>
            )}
            <label>E-Mail-Adresse
              <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@beispiel.de" />
            </label>
            <label>Passwort
              <input required minLength={8} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mindestens 8 Zeichen" />
            </label>
            {mode === "register" && (
              <label className="legal-consent">
                <input required type="checkbox" checked={form.acceptedTerms} onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })} />
                <span>Ich akzeptiere die <a href={appPath("/agb/")}>AGB</a> und habe die <a href={appPath("/datenschutz/")}>Datenschutzerklärung</a> zur Kenntnis genommen.</span>
              </label>
            )}
            {error && <div className="form-error" role="alert">{error}</div>}
            {notice && <div className="form-notice" role="status">{notice}</div>}
            <button className="primary-button full-button" disabled={busy} type="submit">{busy ? "Einen Moment …" : mode === "login" ? "Weiterlernen" : "Lernkonto erstellen"}<span>→</span></button>
          </form>

          <div className="local-note"><span>✓</span><p><strong>Sicher synchronisiert:</strong> Dein Lernstand wird in deinem persönlichen Konto gespeichert und steht dir auch auf anderen Geräten zur Verfügung.</p></div>
          <LegalLinks className="login-legal" />
        </div>
      </section>
    </main>
  );
}

function ProgressRing({ value }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-ring" style={{ "--progress": `${safeValue * 3.6}deg` }}>
      <div><strong>{safeValue}%</strong><span>lernreif</span></div>
    </div>
  );
}

function Dashboard({ account, questions, learning, onStart, onLogout }) {
  const progressEntries = Object.values(learning.progress);
  const attempts = progressEntries.reduce((sum, item) => sum + item.attempts, 0);
  const correct = progressEntries.reduce((sum, item) => sum + item.correct, 0);
  const mastered = progressEntries.filter((item) => item.mastery >= 4).length;
  const readiness = Math.round((mastered / questions.length) * 100);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;

  const categories = useMemo(() => {
    return [...new Set(questions.map((question) => question.category))].map((category) => {
      const categoryQuestions = questions.filter((question) => question.category === category);
      const categoryMastered = categoryQuestions.filter((question) => learning.progress[question.id]?.mastery >= 4).length;
      return {
        name: category,
        count: categoryQuestions.length,
        percent: Math.round((categoryMastered / categoryQuestions.length) * 100),
      };
    });
  }, [questions, learning.progress]);

  const weakCount = progressEntries.filter((item) => item.attempts > item.correct).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandLockup small />
        <nav>
          <button className="nav-item active"><span>⌂</span>Übersicht</button>
          <button className="nav-item" onClick={() => onStart({ type: "learn" })}><span>◉</span>Lernen</button>
          <button className="nav-item" onClick={() => onStart({ type: "exam" })}><span>✓</span>Prüfung</button>
          <button className="nav-item" onClick={() => onStart({ type: "favorites" })}><span>☆</span>Merkliste</button>
        </nav>
        <div className="sidebar-tip">
          <span>Schon gewusst?</span>
          <p>Kurze, regelmäßige Einheiten festigen Wissen besser als ein langer Lernmarathon.</p>
        </div>
        <button className="account-button" onClick={onLogout}><span>{account.name.slice(0, 1).toUpperCase()}</span><div><strong>{account.name}</strong><small>Testzugang</small></div><b>↗</b></button>
      </aside>

      <main className="dashboard">
        <header className="dashboard-header">
          <div><span className="eyebrow">Fischerprüfung Bayern 2026</span><h1>Servus, {account.name}!</h1><p>Bereit für die nächste Lerneinheit?</p></div>
          <div className="header-actions"><span className="streak">🔥 {learning.streak.days || 0} {(learning.streak.days || 0) === 1 ? "Tag" : "Tage"}</span><button className="avatar" onClick={onLogout} title="Abmelden">{account.name.slice(0, 1).toUpperCase()}</button></div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow eyebrow--light">Dein Lernstand</span>
            <h2>{attempts ? "Du bist auf einem guten Weg." : "Heute ist ein guter Tag zum Anfangen."}</h2>
            <p>{attempts ? `Du hast bereits ${attempts} ${attempts === 1 ? "Antwort" : "Antworten"} abgegeben. Bleib dran und bringe deine schwächsten Themen nach vorn.` : "Starte mit einer kurzen gemischten Runde. Wir merken uns automatisch, wo du noch Übung brauchst."}</p>
            <button className="light-button" onClick={() => onStart({ type: "learn" })}>Jetzt weiterlernen <span>→</span></button>
          </div>
          <ProgressRing value={readiness} />
          <div className="hero-fish"><FishMark /></div>
        </section>

        <section className="metric-grid">
          <article><span className="metric-icon coral">✓</span><div><small>Antwortquote</small><strong>{accuracy}%</strong></div><em>{attempts} {attempts === 1 ? "Versuch" : "Versuche"}</em></article>
          <article><span className="metric-icon blue">◎</span><div><small>Sicher gelernt</small><strong>{mastered}</strong></div><em>von {questions.length}</em></article>
          <article><span className="metric-icon amber">↻</span><div><small>Fehler wiederholen</small><strong>{weakCount}</strong></div><button onClick={() => onStart({ type: "mistakes" })}>Starten</button></article>
        </section>

        <div className="section-heading"><div><span className="eyebrow">Lernwege</span><h2>Was möchtest du üben?</h2></div></div>
        <section className="quick-grid">
          <button className="quick-card quick-card--primary" onClick={() => onStart({ type: "exam" })}><span className="quick-icon">✓</span><div><strong>Prüfung simulieren</strong><small>60 Fragen wie in der echten Prüfung</small></div><b>→</b></button>
          <button className="quick-card" onClick={() => onStart({ type: "images" })}><span className="quick-icon">▧</span><div><strong>Bilderfragen</strong><small>Fische und Geräte sicher erkennen</small></div><b>→</b></button>
          <button className="quick-card" onClick={() => onStart({ type: "favorites" })}><span className="quick-icon">☆</span><div><strong>Deine Merkliste</strong><small>{learning.favorites.length} gespeicherte Fragen</small></div><b>→</b></button>
        </section>

        <div className="section-heading category-heading"><div><span className="eyebrow">Fachgebiete</span><h2>Gezielt nach Thema lernen</h2></div></div>
        <section className="category-grid">
          {categories.map((category) => (
            <button className="category-card" key={category.name} onClick={() => onStart({ type: "category", category: category.name })}>
              <span className="category-icon">{CATEGORY_ICONS[category.name] || "•"}</span>
              <div className="category-copy"><strong>{category.name}</strong><small>{category.count} Fragen</small><div className="bar"><i style={{ width: `${category.percent}%` }} /></div></div>
              <b>{category.percent}%</b>
            </button>
          ))}
        </section>

        <footer><p>Fragenkatalog 2026 · Lerninhalte und Erklärungen © Angelschule Bayern</p><LegalLinks /></footer>
      </main>
      <nav className="mobile-nav"><button className="active"><span>⌂</span>Start</button><button onClick={() => onStart({ type: "learn" })}><span>◉</span>Lernen</button><button onClick={() => onStart({ type: "exam" })}><span>✓</span>Prüfung</button><button onClick={() => onStart({ type: "favorites" })}><span>☆</span>Merken</button></nav>
    </div>
  );
}

function QuizImage({ src, alt }) {
  return <img className="question-image" src={appPath(src)} alt={alt} />;
}

function ExamSummary({ result, onDashboard, onRestart }) {
  const totalCorrect = result.answers.filter((item) => item.correct).length;
  const categoryRows = CORE_CATEGORIES.map((category) => {
    const answers = result.answers.filter((item) => item.category === category);
    return { category, correct: answers.filter((item) => item.correct).length, total: answers.length };
  });
  const passed = totalCorrect >= 45 && categoryRows.every((row) => row.correct >= 6);
  return (
    <main className="summary-shell">
      <section className="summary-card">
        <span className={`summary-badge ${passed ? "passed" : "failed"}`}>{passed ? "Bestanden" : "Weiter üben"}</span>
        <h1>{passed ? "Petri Heil – das war prüfungsreif!" : "Fast geschafft. Jetzt die Lücken schließen."}</h1>
        <p>Du hast <strong>{totalCorrect} von 60 Fragen</strong> richtig beantwortet. Benötigt werden mindestens 45 insgesamt und mindestens 6 je Fachgebiet.</p>
        <div className="score-circle"><strong>{totalCorrect}</strong><span>/ 60</span></div>
        <div className="summary-categories">
          {categoryRows.map((row) => <div key={row.category}><span>{row.category}</span><strong className={row.correct >= 6 ? "good" : "bad"}>{row.correct} / {row.total}</strong></div>)}
        </div>
        <div className="summary-actions"><button className="secondary-button" onClick={onDashboard}>Zur Übersicht</button><button className="primary-button" onClick={onRestart}>Noch einmal</button></div>
        <LegalLinks className="summary-legal" />
      </section>
    </main>
  );
}

function QuizScreen({ session, learning, onUpdateLearning, onDashboard, onRestart }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [examAnswers, setExamAnswers] = useState([]);
  const [examResult, setExamResult] = useState(null);
  const question = session.questions[index];
  const isExam = session.mode === "exam";

  function toggleFavorite() {
    const exists = learning.favorites.includes(question.id);
    onUpdateLearning({
      ...learning,
      favorites: exists ? learning.favorites.filter((id) => id !== question.id) : [...learning.favorites, question.id],
    });
  }

  function recordAnswer(correct) {
    const previous = learning.progress[question.id] || { attempts: 0, correct: 0, mastery: 0 };
    const currentDate = todayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = learning.streak.date === currentDate
      ? learning.streak
      : { date: currentDate, days: learning.streak.date === todayKey(yesterday) ? learning.streak.days + 1 : 1 };
    onUpdateLearning({
      ...learning,
      streak,
      progress: {
        ...learning.progress,
        [question.id]: {
          attempts: previous.attempts + 1,
          correct: previous.correct + (correct ? 1 : 0),
          mastery: Math.max(0, Math.min(5, previous.mastery + (correct ? 1 : -1))),
          lastSeen: new Date().toISOString(),
        },
      },
    });
  }

  function nextQuestion() {
    setSelected(null);
    setChecked(false);
    setShowExplanation(false);
    setIndex((value) => value + 1);
  }

  function primaryAction() {
    if (selected === null) return;
    const correct = selected === question.correctAnswer;
    if (isExam) {
      const nextAnswers = [...examAnswers, { id: question.id, category: question.category, selected, correct }];
      setExamAnswers(nextAnswers);
      recordAnswer(correct);
      if (index === session.questions.length - 1) setExamResult({ answers: nextAnswers });
      else nextQuestion();
      return;
    }
    if (!checked) {
      setChecked(true);
      recordAnswer(correct);
    } else if (index === session.questions.length - 1) {
      onDashboard();
    } else {
      nextQuestion();
    }
  }

  if (examResult) return <ExamSummary result={examResult} onDashboard={onDashboard} onRestart={onRestart} />;
  if (!question) return (
    <main className="empty-shell"><div><FishMark /><h1>Hier gibt es noch nichts zu lernen.</h1><p>Speichere Fragen oder beantworte zunächst einige Fragen falsch, damit diese Runde gefüllt wird.</p><button className="primary-button" onClick={onDashboard}>Zur Übersicht</button></div></main>
  );

  const selectedCorrect = selected === question.correctAnswer;
  const progressPercent = Math.round(((index + (checked || isExam ? 1 : 0)) / session.questions.length) * 100);

  return (
    <main className="quiz-shell">
      <header className="quiz-topbar">
        <button className="back-button" onClick={onDashboard} aria-label="Lerneinheit verlassen">←</button>
        <div className="quiz-progress"><div><span>{session.title}</span><strong>{index + 1} von {session.questions.length}</strong></div><div className="bar"><i style={{ width: `${progressPercent}%` }} /></div></div>
        <button className={`favorite-button ${learning.favorites.includes(question.id) ? "active" : ""}`} onClick={toggleFavorite} aria-label="Frage merken">☆</button>
      </header>

      <section className="question-card">
        <div className="question-meta"><span>{question.category}</span><small>Frage {question.id}</small></div>
        {question.questionImages.length > 0 && <div className="question-images">{question.questionImages.map((src, imageIndex) => <QuizImage key={src} src={src} alt={`Abbildung zu Frage ${question.id}${question.questionImages.length > 1 ? `, Bild ${imageIndex + 1}` : ""}`} />)}</div>}
        <div className="question-heading-row">
          <h1>{question.question}</h1>
          {!isExam && <button className={`explanation-dot ${showExplanation ? "active" : ""}`} onClick={() => setShowExplanation((value) => !value)} aria-expanded={showExplanation} aria-label="Erklärung anzeigen">i<span>Erklärung</span></button>}
        </div>

        <fieldset className="answers" disabled={checked && !isExam}>
          <legend>Wähle eine Antwort aus</legend>
          {question.answers.map((answer, answerIndex) => {
            const isSelected = selected === answerIndex;
            const showCorrect = checked && answerIndex === question.correctAnswer;
            const showWrong = checked && isSelected && !selectedCorrect;
            return (
              <label className={`${isSelected ? "selected" : ""} ${showCorrect ? "correct" : ""} ${showWrong ? "wrong" : ""}`} key={`${question.id}-${answerIndex}`}>
                <input type="radio" name={`answer-${question.id}`} checked={isSelected} onChange={() => setSelected(answerIndex)} />
                <span className="radio-mark">{showCorrect ? "✓" : showWrong ? "×" : ""}</span>
                <strong>{answer.text}</strong>
              </label>
            );
          })}
        </fieldset>

        {!isExam && showExplanation && (
          <aside className="explanation-box">
            <div className="explanation-title"><span>i</span><strong>Erklärung</strong></div>
            <p>{question.explanation || "Zu dieser Frage enthält die Word-Vorlage keinen zusätzlichen Kommentar."}</p>
            {question.explanationImages.map((src) => <QuizImage key={src} src={src} alt={`Erklärung zu Frage ${question.id}`} />)}
          </aside>
        )}

        {!isExam && checked && (
          <div className={`answer-feedback ${selectedCorrect ? "correct" : "wrong"}`}><span>{selectedCorrect ? "✓" : "!"}</span><p><strong>{selectedCorrect ? "Richtig beantwortet" : "Das war noch nicht richtig"}</strong>{selectedCorrect ? "Sehr gut – weiter so!" : "Schau dir die richtige Antwort und bei Bedarf die Erklärung an."}</p></div>
        )}

        <button className="primary-button quiz-action" disabled={selected === null} onClick={primaryAction}>
          {isExam ? (index === session.questions.length - 1 ? "Prüfung auswerten" : "Antwort speichern") : checked ? (index === session.questions.length - 1 ? "Runde beenden" : "Nächste Frage") : "Antwort prüfen"}<span>→</span>
        </button>
      </section>
      <p className="keyboard-tip">Tipp: Die Erklärung öffnest du über den kleinen <strong>i-Punkt</strong> neben der Frage.</p>
      <LegalLinks className="quiz-legal" />
    </main>
  );
}

export default function Home() {
  const [account, setAccount] = useState(null);
  const [payload, setPayload] = useState(null);
  const [learning, setLearning] = useState(null);
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    currentAccount()
      .then((nextAccount) => {
        if (active) setAccount(nextAccount);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    const unsubscribe = subscribeToAccount((nextAccount) => {
      if (active) setAccount(nextAccount);
    });
    fetch(appPath("/data/questions.json"))
      .then((response) => {
        if (!response.ok) throw new Error("Fragen konnten nicht geladen werden.");
        return response.json();
      })
      .then(setPayload)
      .catch((error) => setLoadError(error.message));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (account) {
      setLearning(null);
      loadLearningState(account.id).then((nextLearning) => {
        if (active) setLearning(nextLearning);
      });
    } else {
      setLearning(null);
    }
    return () => {
      active = false;
    };
  }, [account]);

  function updateLearning(next) {
    setLearning(next);
    saveLearningState(account.id, next);
  }

  function buildSession(spec) {
    const questions = payload.questions;
    let queue = [];
    let title = "Gemischte Lernrunde";
    let mode = "learn";

    if (spec.type === "exam") {
      mode = "exam";
      title = "Prüfungssimulation";
      queue = CORE_CATEGORIES.flatMap((category) => shuffle(questions.filter((question) => question.category === category)).slice(0, 12));
      queue = shuffle(queue);
    } else if (spec.type === "category") {
      title = spec.category;
      queue = shuffle(questions.filter((question) => question.category === spec.category)).slice(0, 30);
    } else if (spec.type === "images") {
      title = "Bilderfragen";
      queue = shuffle(questions.filter((question) => question.category === "Bilderfragen"));
    } else if (spec.type === "favorites") {
      title = "Merkliste";
      queue = shuffle(questions.filter((question) => learning.favorites.includes(question.id)));
    } else if (spec.type === "mistakes") {
      title = "Fehler wiederholen";
      queue = shuffle(questions.filter((question) => {
        const item = learning.progress[question.id];
        return item && item.correct < item.attempts;
      }));
    } else {
      queue = [...questions]
        .sort((left, right) => (learning.progress[left.id]?.mastery || 0) - (learning.progress[right.id]?.mastery || 0) || Math.random() - 0.5)
        .slice(0, 30);
    }
    setSession({ mode, title, questions: queue, spec, createdAt: Date.now() });
  }

  async function logout() {
    await logoutAccount();
    setAccount(null);
    setSession(null);
  }

  if (loadError) return <main className="empty-shell"><div><h1>Die Fragen konnten nicht geladen werden.</h1><p>{loadError}</p></div></main>;
  if (!payload) return <main className="loading-shell"><FishMark /><span>Fragenkatalog wird vorbereitet …</span></main>;
  if (!account) return <LoginScreen onAuthenticated={setAccount} />;
  if (!learning) return <main className="loading-shell"><FishMark /><span>Lernstand wird geladen …</span></main>;
  if (session) return <QuizScreen key={session.createdAt} session={session} learning={learning} onUpdateLearning={updateLearning} onDashboard={() => setSession(null)} onRestart={() => buildSession(session.spec)} />;
  return <Dashboard account={account} questions={payload.questions} learning={learning} onStart={buildSession} onLogout={logout} />;
}
