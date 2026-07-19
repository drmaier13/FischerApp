# Angelschule Bayern - PrüfungsApp

Lern-App für den offiziellen Fragenkatalog der Fischerprüfung in Bayern 2026.

## Enthalten

- 1.027 Fragen mit je drei Antwortmöglichkeiten
- eindeutige richtige Lösung und Erklärtext aus der Word-Vorlage
- 52 zugeordnete Bilder
- persönliche Lernstände, Merkliste und Fehlertraining
- Prüfungssimulation mit 60 Fragen (12 je Fachgebiet)
- responsive Oberfläche für Mobilgeräte und Desktop

## Lokale Konten

Der aktuelle MVP speichert Konten und Lernstände getrennt im Browser. Passwörter
werden mit PBKDF2 abgeleitet und nicht im Klartext gespeichert. Für Verkauf,
geräteübergreifende Synchronisierung, Passwort-Zurücksetzen und Zahlungszugänge
muss der Speicheradapter in `lib/local-account.js` durch einen serverseitigen
Auth- und Datenbankdienst ersetzt werden.

## Fragenkatalog aktualisieren

Der reproduzierbare Import liegt in `scripts/extract_questions.py`. Er liest
Überschriften, fett markierte Lösungen, Erklärungen und eingebettete Bilder aus
der Word-Datei und erzeugt `public/data/questions.json` sowie `public/images/`.
