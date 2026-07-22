import { LegalPage } from "@/app/legal-layout";

export const metadata = { title: "Konto löschen | Angelschule Bayern – PrüfungsApp" };

export default function KontoLoeschenPage() {
  return (
    <LegalPage eyebrow="Deine Daten" title="Lernkonto und Daten löschen" intro="Du kannst jederzeit die Löschung deines Lernkontos und des dazu gespeicherten Lernstands verlangen.">
      <section>
        <h2>So stellst du den Löschantrag</h2>
        <ol>
          <li>Sende die Anfrage möglichst von der E-Mail-Adresse, mit der dein Lernkonto registriert ist.</li>
          <li>Verwende den Betreff „Lernkonto löschen“.</li>
          <li>Wir können zur Sicherheit eine Bestätigung verlangen, bevor wir das Konto löschen.</li>
        </ol>
        <p><a className="legal-action" href="mailto:info@angelschule.bayern?subject=Lernkonto%20löschen">Löschung per E-Mail anfordern</a></p>
      </section>

      <section>
        <h2>Welche Daten werden gelöscht?</h2>
        <p>Nach erfolgreicher Prüfung der Anfrage löschen wir das Benutzerkonto, den zugehörigen persönlichen Lernstand, Antwortstatistiken, Merkliste und Lernserie. Lokale App-Daten können zusätzlich durch Abmelden und Löschen der Website-Daten im Browser entfernt werden.</p>
      </section>

      <section>
        <h2>Was kann länger gespeichert bleiben?</h2>
        <p>Daten, die wir aufgrund gesetzlicher Pflichten aufbewahren müssen – beispielsweise bestimmte Vertrags-, Zahlungs- oder Buchungsunterlagen – werden nicht sofort gelöscht, sondern gesperrt und nach Ablauf der jeweiligen Frist entfernt. Daten können außerdem vorübergehend in technisch erforderlichen Sicherungskopien verbleiben.</p>
      </section>

      <section>
        <h2>Abonnements gesondert kündigen</h2>
        <p>Die Löschung des Lernkontos beendet nicht automatisch ein über Apple oder Google abgeschlossenes Abonnement. Ein solches Abonnement muss zusätzlich in der Abonnementverwaltung des jeweiligen App-Stores gekündigt werden.</p>
      </section>
    </LegalPage>
  );
}
