import { LegalPage } from "@/app/legal-layout";

export const metadata = {
  title: "Anleitung | Angelschule Bayern – PrüfungsApp",
  description: "So funktionieren Lernrunden, Wiederholungen, Fehlertraining und Prüfungssimulation in der PrüfungsApp.",
};

const LEARNING_LEVELS = [
  { level: "0", label: "Neu", description: "Die Frage wurde noch nicht sicher gelernt." },
  { level: "+1", label: "Richtig", description: "Jede richtige Antwort erhöht den Lernstand der Frage um eine Stufe." },
  { level: "−1", label: "Fehler", description: "Eine falsche Antwort senkt den Lernstand um eine Stufe, jedoch nie unter null." },
  { level: "4–5", label: "Sicher gelernt", description: "Ab Stufe vier zählt die Frage in der Übersicht als sicher gelernt." },
];

export default function AnleitungPage() {
  return (
    <LegalPage
      eyebrow="App-Anleitung"
      title="So lernst du mit der PrüfungsApp"
      intro="Die App merkt sich jede Antwort und stellt dir bevorzugt die Fragen, bei denen du noch Übung brauchst. Hier erfährst du genau, wie Wiederholungen, Fehlertraining und Prüfungssimulation funktionieren."
    >
      <section className="guide-summary">
        <span className="guide-summary-icon" aria-hidden="true">✓</span>
        <div>
          <h2>Kurz erklärt</h2>
          <p>Richtige Antworten erhöhen den Lernstand einer Frage, Fehler senken ihn. In gemischten Lernrunden kommen Fragen mit niedrigem Lernstand bevorzugt an die Reihe. So übst du Unsicherheiten häufiger, ohne bereits gut beherrschte Themen unnötig oft zu wiederholen.</p>
        </div>
      </section>

      <section>
        <h2>1. Wie oft wird eine Frage wiederholt?</h2>
        <p>Es gibt keine starre Vorgabe wie „jede Frage genau dreimal“. Jede Frage besitzt stattdessen einen eigenen Lernstand von null bis fünf. Eine neue Frage startet bei null und entwickelt sich mit deinen Antworten.</p>
        <div className="guide-level-grid">
          {LEARNING_LEVELS.map((item) => (
            <article key={item.level}>
              <strong>{item.level}</strong>
              <div><h3>{item.label}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
        <p>Eine gemischte Lernrunde enthält 30 Fragen. Dabei werden Fragen mit dem niedrigsten Lernstand bevorzugt ausgewählt. Eine unsichere Frage kann deshalb schon in einer der nächsten Runden wieder erscheinen. Sicher gelernte Fragen werden seltener berücksichtigt, aber nicht dauerhaft ausgeschlossen.</p>
        <aside className="guide-note"><strong>Wichtig:</strong> Eine falsche Antwort kann zusätzliche Wiederholungen notwendig machen. Deshalb kann dieselbe Frage häufiger als viermal erscheinen.</aside>
      </section>

      <section>
        <h2>2. Was passiert bei einer falschen Antwort?</h2>
        <ol className="guide-steps">
          <li><span>1</span><div><strong>Antwort prüfen</strong><p>Deine gewählte falsche Antwort wird rot und die richtige Antwort grün markiert.</p></div></li>
          <li><span>2</span><div><strong>Erklärung ansehen</strong><p>Über den kleinen i-Punkt neben der Frage kannst du die ausführliche Erklärung öffnen.</p></div></li>
          <li><span>3</span><div><strong>Lernstand anpassen</strong><p>Der Lernstand der Frage sinkt um eine Stufe. Dadurch erhält die Frage bei späteren Lernrunden wieder eine höhere Priorität.</p></div></li>
          <li><span>4</span><div><strong>Fehler wiederholen</strong><p>Sobald du eine Frage mindestens einmal falsch beantwortet hast, wird sie in den Bereich „Fehler wiederholen“ aufgenommen.</p></div></li>
        </ol>
        <p>Die Fehlerliste dient als dauerhafte Sammlung deiner bisherigen Stolperstellen. Deshalb bleibt eine einmal falsch beantwortete Frage dort auch nach späteren richtigen Antworten verfügbar. Richtige Antworten erhöhen ihren Lernstand trotzdem weiter, bis sie als sicher gelernt gilt.</p>
      </section>

      <section>
        <h2>3. Welche Lernwege gibt es?</h2>
        <div className="guide-paths">
          <article><span>◎</span><h3>Gemischte Lernrunde</h3><p>30 Fragen aus allen Bereichen. Schwächere Fragen werden bevorzugt.</p></article>
          <article><span>§</span><h3>Nach Fachgebiet</h3><p>Bis zu 30 zufällig ausgewählte Fragen aus einem bestimmten Themenbereich.</p></article>
          <article><span>↻</span><h3>Fehler wiederholen</h3><p>Alle Fragen, die du bisher mindestens einmal falsch beantwortet hast.</p></article>
          <article><span>☆</span><h3>Merkliste</h3><p>Fragen, die du selbst mit dem Stern gespeichert hast.</p></article>
          <article><span>▧</span><h3>Bilderfragen</h3><p>Eine eigene Runde mit den Bildfragen zu Fischen und Geräten.</p></article>
          <article><span>✓</span><h3>Prüfungssimulation</h3><p>60 Fragen unter Prüfungsbedingungen – zwölf aus jedem der fünf Fachgebiete.</p></article>
        </div>
      </section>

      <section>
        <h2>4. Wie funktioniert die Prüfungssimulation?</h2>
        <p>Die Simulation enthält 60 Fragen: jeweils zwölf aus Fischkunde, Gewässerkunde, Schutz/Pflege/Hege, Gerätekunde und Rechtskunde. Während der Simulation gibt es keine Lösungshinweise oder Erklärungen. Das Ergebnis erscheint erst am Ende.</p>
        <div className="guide-exam-rule">
          <div><strong>45</strong><span>richtige Antworten insgesamt</span></div>
          <div><strong>6</strong><span>richtige Antworten je Fachgebiet</span></div>
        </div>
        <p>Nur wenn beide Bedingungen erfüllt sind, wird die Simulation als bestanden bewertet. Auch die Antworten aus der Simulation fließen in deinen persönlichen Lernstand ein.</p>
      </section>

      <section>
        <h2>5. Was zeigt die Übersicht?</h2>
        <dl className="guide-definitions">
          <div><dt>Antwortquote</dt><dd>Anteil deiner richtigen Antworten an allen bisherigen Versuchen.</dd></div>
          <div><dt>Sicher gelernt</dt><dd>Anzahl der Fragen, die mindestens Lernstufe vier erreicht haben.</dd></div>
          <div><dt>Fehler wiederholen</dt><dd>Fragen, die du bisher mindestens einmal falsch beantwortet hast.</dd></div>
          <div><dt>Lernserie</dt><dd>Anzahl aufeinanderfolgender Tage, an denen du mindestens eine Frage beantwortet hast.</dd></div>
        </dl>
      </section>

      <section>
        <h2>6. Unsere Empfehlung für deinen Lernerfolg</h2>
        <ul className="guide-checklist">
          <li>Lieber täglich 15 bis 20 Minuten lernen als einmal pro Woche mehrere Stunden.</li>
          <li>Mit einer gemischten Lernrunde starten und anschließend die Fehler wiederholen.</li>
          <li>Schwache Fachgebiete zusätzlich gezielt bearbeiten.</li>
          <li>Erklärungen auch nach einer richtigen, aber unsicheren Antwort lesen.</li>
          <li>Regelmäßig eine Prüfung simulieren, sobald die Grundlagen sicher sitzen.</li>
        </ul>
      </section>

      <section>
        <h2>7. Lernkonto und Zugangszeitraum</h2>
        <p>Dein Lernstand wird automatisch in deinem persönlichen Konto gespeichert und steht dir nach der Anmeldung auch auf anderen Geräten zur Verfügung. Der Zugang ist ab der Bestätigung deiner E-Mail-Adresse zwölf Monate freigeschaltet. Das genaue Ablaufdatum siehst du in der App.</p>
        <p>Nach Ablauf bleibt dein Lernstand gespeichert, die Lernfunktionen sind jedoch gesperrt. Eine Verlängerung kannst du direkt über die dann angezeigte Kontaktmöglichkeit anfragen.</p>
      </section>
    </LegalPage>
  );
}
