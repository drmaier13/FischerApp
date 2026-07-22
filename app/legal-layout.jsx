import { appPath } from "@/lib/app-path";

const LEGAL_LINKS = [
  ["Anleitung", "/anleitung/"],
  ["Impressum", "/impressum/"],
  ["Datenschutz", "/datenschutz/"],
  ["AGB", "/agb/"],
  ["Widerruf", "/widerruf/"],
  ["Konto löschen", "/konto-loeschen/"],
];

export function LegalPage({ eyebrow = "Rechtliches", title, intro, updated = "22. Juli 2026", children }) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <a className="legal-brand" href={appPath("/")} aria-label="Zur PrüfungsApp">
          <span aria-hidden="true">◉</span>
          <strong>Angelschule Bayern <small>– PrüfungsApp</small></strong>
        </a>
        <a className="legal-back" href={appPath("/")}>Zur App</a>
      </header>

      <article className="legal-card">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {intro && <p className="legal-intro">{intro}</p>}
        <p className="legal-updated">Stand: {updated}</p>
        <div className="legal-content">{children}</div>
      </article>

      <nav className="legal-nav" aria-label="Hilfe und rechtliche Informationen">
        {LEGAL_LINKS.map(([label, href]) => <a key={href} href={appPath(href)}>{label}</a>)}
      </nav>
    </main>
  );
}
