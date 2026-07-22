import { LegalPage } from "@/app/legal-layout";

export const metadata = { title: "Datenschutz | Angelschule Bayern – PrüfungsApp" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" intro="Hier informieren wir darüber, welche personenbezogenen Daten in der PrüfungsApp verarbeitet werden und welche Rechte du hast.">
      <section>
        <h2>1. Verantwortlicher</h2>
        <address>
          Herbert Maier, Angelschule Bayern<br />
          Heckenweg 8, 83370 Seeon<br />
          Telefon: <a href="tel:+4986244837">+49 8624 4837</a><br />
          E-Mail: <a href="mailto:info@angelschule.bayern">info@angelschule.bayern</a>
        </address>
      </section>

      <section>
        <h2>2. Bereitstellung der App und Server-Protokolle</h2>
        <p>Beim Aufruf der App werden technisch erforderliche Verbindungsdaten verarbeitet. Dazu können IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, übertragene Datenmenge, Browser- und Geräteinformationen, Referrer sowie Status- und Fehlerangaben gehören.</p>
        <p>Die Verarbeitung ist erforderlich, um die App sicher und zuverlässig bereitzustellen, Störungen zu erkennen und Missbrauch abzuwehren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt im sicheren und funktionsfähigen Betrieb des Angebots. Empfänger können unsere Hosting- und Infrastruktur-Dienstleister sein.</p>
      </section>

      <section>
        <h2>3. Lernkonto und Anmeldung</h2>
        <p>Bei der Registrierung verarbeiten wir deinen Vornamen, deine E-Mail-Adresse, eine technische Benutzer-ID, den Zeitpunkt der Registrierung und E-Mail-Bestätigung, Beginn und Ende des Zugangszeitraums, die bestätigte Fassung der Nutzungsbedingungen und die für Anmeldung und E-Mail-Bestätigung erforderlichen Daten. Das Passwort wird durch unseren Authentifizierungsdienst verarbeitet und nicht im Klartext gespeichert.</p>
        <p>Die Daten werden zur Einrichtung und Verwaltung des Lernkontos, zur Anmeldung und zur Wiederherstellung des Zugangs verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Soweit Sicherheitsprotokolle zur Abwehr unberechtigter Zugriffe erforderlich sind, beruht die Verarbeitung zusätzlich auf Art. 6 Abs. 1 lit. f DSGVO.</p>
      </section>

      <section>
        <h2>4. Persönlicher Lernstand</h2>
        <p>Wir speichern zum Lernkonto insbesondere bearbeitete Fragen, Antwortversuche, richtige Antworten, Lernfortschritt, zuletzt bearbeitete Zeitpunkte, Merkliste und Lernserie. Diese Daten dienen ausschließlich dazu, den persönlichen Lernstand zu speichern, passende Wiederholungen anzubieten und den Fortschritt geräteübergreifend zu synchronisieren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section>
        <h2>5. Supabase</h2>
        <p>Für Benutzerkonten, Anmeldung, Datenbank und Synchronisierung setzen wir Supabase ein. Anbieter ist Supabase, Inc. Dabei werden die unter den Ziffern 3 und 4 beschriebenen Daten sowie technische Verbindungsdaten in unserem Auftrag verarbeitet.</p>
        <p>Je nach eingesetzter Infrastruktur können Daten auch außerhalb des Europäischen Wirtschaftsraums verarbeitet werden. Soweit erforderlich, stützt Supabase internationale Übermittlungen auf geeignete Garantien, insbesondere EU-Standardvertragsklauseln. Weitere Informationen: <a href="https://supabase.com/privacy">Datenschutz bei Supabase</a>.</p>
      </section>

      <section>
        <h2>6. Lokale Speicherung auf dem Gerät</h2>
        <p>Die App speichert technisch erforderliche Informationen im Browser, insbesondere die angemeldete Sitzung und eine lokale Kopie des Lernstands. Dadurch bleiben Anmeldung und Lernfortschritt nutzbar und können bei einer vorübergehend unterbrochenen Verbindung wieder synchronisiert werden.</p>
        <p>Diese Speicherung ist für den ausdrücklich gewünschten App-Dienst erforderlich. Sie erfolgt auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG; die anschließende Verarbeitung personenbezogener Daten beruht auf Art. 6 Abs. 1 lit. b DSGVO. Die aktuelle App verwendet keine Analyse-, Marketing- oder Werbe-Tracker.</p>
      </section>

      <section>
        <h2>7. Kontaktaufnahme</h2>
        <p>Wenn du uns per E-Mail oder Telefon kontaktierst, verarbeiten wir deine Kontaktdaten und den Inhalt der Anfrage, um sie zu beantworten. Rechtsgrundlage ist je nach Anliegen Art. 6 Abs. 1 lit. b oder lit. f DSGVO. Geschäftliche Kommunikation kann aufgrund gesetzlicher Aufbewahrungspflichten länger gespeichert werden.</p>
      </section>

      <section>
        <h2>8. Speicherdauer und Löschung</h2>
        <p>Kontodaten und Lernstand speichern wir grundsätzlich bis zur Löschung des Lernkontos. Sicherheits- und Serverprotokolle werden nur so lange aufbewahrt, wie dies für Betrieb, Fehleranalyse und Missbrauchsabwehr erforderlich ist. Gesetzliche Aufbewahrungspflichten, insbesondere für Vertrags- und Zahlungsunterlagen, bleiben unberührt.</p>
        <p>Die Löschung des Lernkontos kann über die Seite <a href="../konto-loeschen/">Konto löschen</a> angefordert werden.</p>
      </section>

      <section>
        <h2>9. Deine Rechte</h2>
        <p>Du hast nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Erteilte Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden. Zur Ausübung genügt eine Nachricht an <a href="mailto:info@angelschule.bayern">info@angelschule.bayern</a>.</p>
        <p>Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren. Für uns ist regelmäßig das Bayerische Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach, zuständig: <a href="https://www.lda.bayern.de/">www.lda.bayern.de</a>.</p>
      </section>

      <section>
        <h2>10. Pflicht zur Bereitstellung und automatisierte Entscheidungen</h2>
        <p>Für ein Lernkonto sind Vorname, E-Mail-Adresse und Passwort erforderlich. Ohne diese Angaben können wir die geräteübergreifende Anmeldung und Speicherung nicht anbieten. Eine ausschließlich automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung und Profiling zu Werbezwecken finden nicht statt.</p>
      </section>

      <section>
        <h2>11. Aktualisierung dieser Erklärung</h2>
        <p>Wir passen diese Datenschutzerklärung an, wenn sich Funktionen, Dienstleister oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung ist in der App abrufbar.</p>
      </section>
    </LegalPage>
  );
}
