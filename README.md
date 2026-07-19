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

Für lokale Builds werden `NEXT_PUBLIC_SUPABASE_URL` und
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` benötigt. Die Vorlage liegt in
`.env.example`; das Datenbankschema in `supabase/migrations/`.

## Fragenkatalog aktualisieren

Der reproduzierbare Import liegt in `scripts/extract_questions.py`. Er liest
Überschriften, fett markierte Lösungen, Erklärungen und eingebettete Bilder aus
der Word-Datei und erzeugt `public/data/questions.json` sowie `public/images/`.
