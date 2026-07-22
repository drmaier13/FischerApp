# Supabase-E-Mail-Vorlagen

## Registrierung bestätigen

**Betreff:** `Bitte bestätige dein Lernkonto – Angelschule Bayern PrüfungsApp`

**Vorlage:** `confirm-sign-up.html`

Die Vorlage verwendet ausschließlich die von Supabase unterstützten Variablen
`{{ .Email }}` und `{{ .ConfirmationURL }}`. Sie kann im Supabase-Dashboard unter
**Authentication → Emails → Confirm sign up** eingefügt werden, sobald der
eigene SMTP-Versand eingerichtet oder die Vorlagenbearbeitung im gebuchten Tarif
freigeschaltet ist.
