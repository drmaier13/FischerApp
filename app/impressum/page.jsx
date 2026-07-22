import { LegalPage } from "@/app/legal-layout";

export const metadata = { title: "Impressum | Angelschule Bayern – PrüfungsApp" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" intro="Anbieterkennzeichnung für die Angelschule Bayern – PrüfungsApp.">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <address>
          Herbert Maier<br />
          Angelschule Bayern<br />
          Heckenweg 8<br />
          83370 Seeon<br />
          Deutschland
        </address>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href="tel:+4986244837">+49 8624 4837</a><br />
          Telefax: +49 8624 1422<br />
          E-Mail: <a href="mailto:info@angelschule.bayern">info@angelschule.bayern</a>
        </p>
      </section>

      <section>
        <h2>Umsatzsteuer-Identifikationsnummer</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: <strong>DE168128328</strong></p>
      </section>

      <section>
        <h2>Redaktionell verantwortlich</h2>
        <address>
          Felix Pröller<br />
          Heckenweg 8<br />
          83370 Seeon
        </address>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Wir nehmen an Streitbeilegungsverfahren vor der folgenden Verbraucherschlichtungsstelle teil:</p>
        <address>
          Universalschlichtungsstelle des Bundes<br />
          Zentrum für Schlichtung e. V.<br />
          Straßburger Straße 8<br />
          77694 Kehl am Rhein<br />
          <a href="https://www.universalschlichtungsstelle.de/">www.universalschlichtungsstelle.de</a>
        </address>
      </section>

      <section>
        <h2>Hinweis zur Fischerprüfung</h2>
        <p>Die PrüfungsApp ist ein privates Lernangebot. Sie ist kein Angebot und keine offizielle Veröffentlichung des Freistaats Bayern oder einer Prüfungsbehörde.</p>
      </section>
    </LegalPage>
  );
}
