# Angelschule Bayern - PrüfungsApp

Lern-App für den offiziellen Fragenkatalog der Fischerprüfung in Bayern 2026.

## Enthalten

- 1.027 Fragen mit je drei Antwortmöglichkeiten
- eindeutige richtige Lösung und Erklärtext aus der Word-Vorlage
- 52 zugeordnete Bilder
- persönliche Lernstände, Merkliste und Fehlertraining
- Prüfungssimulation mit 60 Fragen (12 je Fachgebiet)
- responsive Oberfläche für Mobilgeräte und Desktop

## Benutzerkonten und Lernstand

Anmeldung und Registrierung laufen über Supabase Auth. Lernstände, Merkliste und
Streak werden in `public.learning_states` gespeichert und zusätzlich lokal
zwischengespeichert. Row Level Security stellt sicher, dass angemeldete Nutzer
nur ihren eigenen Datensatz lesen und verändern können.

## Jahreszugänge, kostenlose Freigaben und Verkauf

Das Berechtigungsmodell trennt das kostenlose Lernkonto vom eigentlichen
App-Zugang. Bestehende Freischaltungen bleiben erhalten. Neue Nutzer erhalten
Zugang über:

- einen bezahlten 365-Tage-Zugang über Stripe Checkout,
- eine persönliche kostenlose Freigabe durch die Verwaltung oder
- einen zeitlich und mengenmäßig begrenzbaren Freischaltcode.

Die Seite `/verwaltung/` zeigt Lernkonten und Laufzeiten, erlaubt kostenlose
Freigaben und erzeugt einmalig sichtbare Aktionscodes. Verwaltungsrechte werden
serverseitig über die Supabase-Funktionsvariable `ADMIN_EMAILS` geprüft.

Die Datenbankerweiterung liegt in
`supabase/migrations/202607240001_create_commercial_access.sql`. Die Funktionen
`create-checkout-session`, `stripe-webhook` und `access-admin` liegen unter
`supabase/functions/`. Für den produktiven Betrieb werden dort
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_TAX_RATE_ID`,
`STRIPE_WEBHOOK_SECRET`, `APP_URL` und
`ADMIN_EMAILS` benötigt.

Der sichtbare Kaufknopf wird erst mit
`NEXT_PUBLIC_CHECKOUT_ENABLED=1` aktiviert. Preistext und öffentliche Adresse
werden über `NEXT_PUBLIC_ANNUAL_PRICE_LABEL` und `NEXT_PUBLIC_SITE_URL`
eingestellt.

Der abgestimmte Stripe-Ablauf einschließlich Test- und Freigabeschritten ist in
`docs/stripe-integration-plan.md` dokumentiert. Die Härtungsmigration
`supabase/migrations/202607240002_harden_stripe_checkout.sql` ergänzt stabile
Bestellkennungen sowie Stripe-Kunden- und Rechnungsreferenzen. Checkout erstellt
für erfolgreiche Einmalzahlungen eine bezahlte Rechnung.

Für lokale Builds werden `NEXT_PUBLIC_SUPABASE_URL` und
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` benötigt. Die Vorlage liegt in
`.env.example`; das Datenbankschema in `supabase/migrations/`.

## Statischer Upload in einen Unterordner

Für den Betrieb unter `https://angelschule.bayern/app/` wird der Export mit
`NEXT_PUBLIC_BASE_PATH=/app` und `STATIC_EXPORT=1` gebaut. Der erzeugte Inhalt
aus `out/` kann anschließend in den Webserver-Ordner `app` übertragen werden.

## Fragenkatalog aktualisieren

Der reproduzierbare Import liegt in `scripts/extract_questions.py`. Er liest
Überschriften, fett markierte Lösungen, Erklärungen und eingebettete Bilder aus
der Word-Datei und erzeugt `public/data/questions.json` sowie `public/images/`.
