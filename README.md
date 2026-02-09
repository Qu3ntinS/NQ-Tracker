# NQ Tracker

Time‑Tracking MVP (React + Electron + SQLite) mit modernem purple Glass‑Design.

## Features (MVP)
- Tages‑Timetable (drag & resize Einträge, Raster nach Mindest‑Intervall)
- Wochenansicht mit Tagesziel‑Progress
- Projekte + Kommentare pro Eintrag
- Konfig: Mindest‑Eintrag (Default 15 Min) & Tagesziel (Default 8h)
- SQLite Storage (lokal)

## Dev

```bash
npm install
npm run electron:dev
```

## Build (Release)

```bash
npm run electron:build
```

## Release Pipeline

GitHub Releases werden bei Tags erstellt:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Notes
- In Dev‑Mode werden Daten per SQLite in `app.getPath("userData")` gespeichert.
- UI: purple glass / Tailwind.
