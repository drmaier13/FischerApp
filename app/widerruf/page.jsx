import { LegalPage } from "@/app/legal-layout";

export const metadata = { title: "Widerruf | Angelschule Bayern – PrüfungsApp" };

export default function WiderrufPage() {
  return (
    <LegalPage title="Widerrufsbelehrung" intro="Diese Belehrung gilt für kostenpflichtige Verträge, die Verbraucher unmittelbar mit der Angelschule Bayern im Fernabsatz schließen.">
      <section>
        <h2>Widerrufsrecht</h2>
        <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.</p>
        <p>Um dein Widerrufsrecht auszuüben, musst du uns – Herbert Maier, Angelschule Bayern, Heckenweg 8, 83370 Seeon, Telefon +49 8624 4837, E-Mail <a href="mailto:info@angelschule.bayern">info@angelschule.bayern</a> – mittels einer eindeutigen Erklärung über deinen Entschluss informieren. Du kannst dafür das unten stehende Muster verwenden; vorgeschrieben ist es nicht.</p>
        <p>Zur Wahrung der Frist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>
      </section>

      <section>
        <h2>Folgen des Widerrufs</h2>
        <p>Wenn du den Vertrag widerrufst, erstatten wir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab Eingang deines Widerrufs. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel wie bei der ursprünglichen Zahlung, sofern nichts anderes vereinbart wurde. Dafür entstehen keine Entgelte.</p>
      </section>

      <section>
        <h2>Vorzeitiges Erlöschen</h2>
        <p>Bei nicht auf einem körperlichen Datenträger bereitgestellten digitalen Inhalten kann das Widerrufsrecht vorzeitig erlöschen, wenn wir mit der Vertragserfüllung begonnen haben, du dem Beginn vor Ablauf der Widerrufsfrist ausdrücklich zugestimmt und deine Kenntnis vom Verlust des Widerrufsrechts bestätigt hast und wir dir eine Vertragsbestätigung zur Verfügung gestellt haben.</p>
        <p>Bei Dienstleistungen erlischt das Widerrufsrecht vorzeitig erst nach vollständiger Leistungserbringung und nur unter den gesetzlichen Voraussetzungen. Bei laufenden digitalen Diensten bleiben die gesetzlichen Regelungen maßgeblich.</p>
      </section>

      <section>
        <h2>Muster-Widerrufsformular</h2>
        <div className="legal-template">
          <p>An Herbert Maier, Angelschule Bayern, Heckenweg 8, 83370 Seeon, E-Mail: info@angelschule.bayern</p>
          <p>Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Nutzung der Angelschule Bayern – PrüfungsApp.</p>
          <p>Bestellt am: ____________________</p>
          <p>Name: __________________________</p>
          <p>Anschrift: ______________________</p>
          <p>Datum: _________________________</p>
          <p>Unterschrift (nur bei Mitteilung auf Papier): ____________________</p>
        </div>
      </section>

      <section>
        <h2>Käufe über App-Stores</h2>
        <p>Wurde der Vertrag über den Apple App Store oder Google Play geschlossen und tritt der jeweilige Store als Vertragspartner oder Zahlungsabwickler auf, sind zusätzlich die dort bereitgestellten Widerrufs- und Erstattungsinformationen zu beachten.</p>
      </section>
    </LegalPage>
  );
}
