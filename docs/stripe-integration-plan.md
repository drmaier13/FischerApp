# Stripe-Integrationsplan

Stand: 24. Juli 2026

## Geschäft und Angebote

Angelschule Bayern verkauft Vorbereitungskurse für die Fischerprüfung, weiterführende
Kurse und Angel-Guidings. In der PrüfungsApp wird ein persönlicher, nicht automatisch
verlängerter Jahreszugang für 14,90 EUR brutto verkauft.

## Empfohlene Aufteilung

1. **Payments / Stripe Checkout für die PrüfungsApp**
   - einmalige Zahlung, keine Subscription;
   - Stripe-hosted Checkout für Karten und die im Dashboard aktivierten passenden
     Zahlungsarten;
   - Freischaltung ausschließlich nach serverseitig verifiziertem Webhook;
   - 365 Tage Zugang, anschließend keine automatische Verlängerung;
   - kostenlose Freigaben bleiben davon getrennt und werden über die App-Verwaltung
     oder persönliche Freischaltcodes vergeben.

2. **Bezahlte Rechnung für App-Käufe**
   - Checkout erzeugt nach erfolgreicher Einmalzahlung eine bezahlte Rechnung;
   - Stripe versendet die Rechnung, sobald „E-Mails bei erfolgreichen Zahlungen“
     aktiviert ist;
   - Stripe-Kunden-, Zahlungs- und Rechnungs-IDs werden zur Zuordnung gespeichert.

3. **Stripe Invoicing für Kurse und Guidings**
   - individuelle Rechnungen werden im Stripe-Dashboard an konkrete Kunden erstellt;
   - Hosted Invoice Page für Onlinezahlung und PDF-Download;
   - diese Rechnungen schalten die PrüfungsApp nicht automatisch frei, außer dies wird
     später ausdrücklich als weiteres Angebot umgesetzt.

## Technischer Zahlungsablauf

1. Der angemeldete Kunde akzeptiert den sofortigen Leistungsbeginn und öffnet Checkout.
2. Eine Supabase Edge Function erstellt serverseitig eine einmalige Checkout Session.
3. Der geheime oder eingeschränkte Stripe-Schlüssel bleibt ausschließlich in den
   Supabase-Geheimnissen.
4. Stripe bestätigt die Zahlung am signierten Webhook.
5. Der Webhook verarbeitet Ereignisse idempotent und verlängert den Zugang genau einmal.
6. Die App wartet nach der Rückleitung kurz auf die Webhook-Freischaltung.
7. Abgelaufene oder fehlgeschlagene Sessions werden protokolliert, ohne Zugang zu geben.

## Stripe-Konfiguration

- Produkt: `Angelschule Bayern – PrüfungsApp · Jahreszugang`
- Preis: einmalig 14,90 EUR brutto, darin enthalten 19 % deutsche Umsatzsteuer
- Webhook-Ereignisse:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
- Webhook-Ziel:
  `https://zwuajbdrxlilxewrziri.supabase.co/functions/v1/stripe-webhook`
- Kunden-E-Mails bei erfolgreichen Zahlungen aktivieren
- Branding, öffentliche Geschäftsangaben und Support-Kontakt vervollständigen

## Geheimnisse in Supabase

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_TAX_RATE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL=https://angelschule.bayern/app`
- `ADMIN_EMAILS=verwaltung@angelschule.bayern`

Schlüssel dürfen nicht in Quellcode, GitHub, Frontend-Variablen, E-Mails oder Chatnachrichten
eingetragen werden. Zuerst wird vollständig im Stripe-Testmodus getestet; erst anschließend
werden getrennte Live-Schlüssel und ein eigener Live-Webhook hinterlegt.

## Test- und Freigabeplan

1. Stripe-E-Mail und Unternehmensprofil bestätigen.
2. Preis und Rechnungen auf 14,90 EUR brutto einschließlich 19 % Umsatzsteuer konfigurieren.
3. Testprodukt, Testpreis, Testschlüssel und Test-Webhook einrichten.
4. Erfolgreiche, abgebrochene, verzögerte und doppelt zugestellte Zahlung testen.
5. Prüfen, dass eine Rechnung versendet und der Zugang exakt einmal freigeschaltet wird.
6. Rückerstattung und manuelle Sperrung als Betriebsablauf testen.
7. Live-Konfiguration getrennt anlegen und mit einer kleinen echten Zahlung prüfen.
8. Kaufknopf erst nach bestandenem Live-Test freischalten und veröffentlichen.
