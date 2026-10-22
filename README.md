# Biblioteka

Domowy księgozbiór na **macOS** (aplikacja z Docka) — książki, wypożyczenia, czytelnicy i etykiety A4.

## Instalacja (Mac)

### 1. Zbuduj instalator

Na Macu z Node.js 20+:

```bash
npm install
npm run desktop:build
```

### 2. Zainstaluj

W katalogu `dist-desktop/` znajdziesz:

- **Biblioteka-1.0.0-arm64.dmg** — Apple Silicon (M1/M2/M3/M4)
- ewentualnie wersję zip

Otwórz DMG i przeciągnij **Biblioteka** (ikona 📚) do **Aplikacje**.

### 3. Pierwsze uruchomienie

Aplikacja nie jest podpisana kontem Apple Developer, więc macOS może zablokować start:

1. **Prawy przycisk** na ikonie → **Otwórz** → potwierdź **Otwórz**  
   albo: *Ustawienia systemowe → Prywatność i bezpieczeństwo → Mimo to otwórz*

Dane (baza SQLite i okładki) są lokalne:

`~/Library/Application Support/biblioteka/data/`

Logi (gdy coś nie startuje): `~/Library/Logs/Biblioteka.log`

## Development

```bash
# przeglądarka
npm run dev

# okno Electron + hot reload
npm run desktop:dev
```

## Funkcje

- Księgozbiór, ISBN, okładki, plan regałów
- Wypożyczenia (żółty / czerwony = wypożyczone / przetrzymane)
- Etykiety A4 z kodem kreskowym
- Raporty i druk spisu z wyborem kolumn
