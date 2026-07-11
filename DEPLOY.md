# Wdrożenie Nexus Sight na Render

## Wymagania

- Konto na [Render](https://render.com)
- Kod źródłowy w repozytorium Git (GitHub, GitLab lub Bitbucket)
- Klucz API Riot Games ([developer.riotgames.com](https://developer.riotgames.com))
- Node.js 20+ (Render zapewnia automatycznie)

---

## Krok 1: Przygotowanie repozytorium

1. Utwórz nowe repozytorium na GitHub (lub GitLab/Bitbucket).
2. Skopiuj kod projektu do repozytorium.
3. Upewnij się, że plik `pnpm-lock.yaml` jest commitowany.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TWOJ_USER/nexus-sight.git
git push -u origin main
```

---

## Krok 2: Tworzenie Web Service na Render

1. Zaloguj się na [dashboard.render.com](https://dashboard.render.com).
2. Kliknij **New** → **Web Service**.
3. Połącz swoje repozytorium z GitHub.
4. Wypełnij formularz:

| Pole | Wartość |
|------|---------|
| **Name** | `nexus-sight` |
| **Region** | Frankfurt (EU Central) lub najbliższy do Ciebie |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install -g pnpm && pnpm install --frozen-lockfile && BASE_PATH=/ pnpm --filter @workspace/web run build && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `NODE_ENV=production PORT=10000 node artifacts/api-server/dist/index.mjs` |
| **Plan** | Free (lub Starter za $7/mies. bez cold starts) |

---

## Krok 3: Zmienne środowiskowe

W ustawieniach Web Service kliknij **Environment** i dodaj:

| Zmienna | Wartość | Opis |
|---------|---------|------|
| `RIOT_API_KEY` | `RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Klucz API z Riot Developer Portal |
| `NODE_ENV` | `production` | Tryb produkcyjny |
| `PORT` | `10000` | Port (Render domyślnie używa 10000) |

---

## Krok 4: Deploy

1. Kliknij **Create Web Service**.
2. Render automatycznie zainstaluje zależności, zbuduje frontend i API.
3. Po zakończeniu buildu, aplikacja będzie dostępna pod adresem:
   `https://nexus-sight.onrender.com`

---

## Jak to działa

Projekt działa jako **jeden serwis**:

- API serwer Express obsługuje endpointy `/api/*` (proxy do Riot Games API)
- W trybie produkcyjnym ten sam serwer serwuje zbudowany frontend (pliki statyczne z Vite build)
- Frontend wysyła zapytania do `/api/*` — na tym samym serwerze, bez problemów z CORS

```
Przeglądarka  →  Render Web Service
                  ├── /api/*  →  Express API  →  Riot Games API
                  └── /*      →  pliki statyczne (React SPA)
```

---

## Aktualizacja

Każdy `git push` na branch `main` automatycznie uruchamia nowy build na Render.

---

## Rozwiązywanie problemów

### "Nie znaleziono gracza"
- Sprawdź czy `RIOT_API_KEY` jest ustawiony poprawnie w zmiennych środowiskowych
- Klucze developerskie Riot wygasają co 24h — wygeneruj nowy na [developer.riotgames.com](https://developer.riotgames.com)
- Do produkcji złóż wniosek o klucz produkcyjny (Personal/Production API Key)

### Aplikacja się nie ładuje
- Sprawdź logi na Render (zakładka **Logs**)
- Upewnij się, że `PORT` jest ustawiony na `10000`
- Sprawdź czy build przeszedł bez błędów

### Cold starts (plan Free)
- Na darmowym planie Render usypia serwis po 15 min nieaktywności
- Pierwsze zapytanie po uśpieniu trwa ~30 sekund
- Rozwiązanie: użyj planu Starter ($7/mies.) lub skonfiguruj health check ping

---

## Struktura plików (produkcja)

```
artifacts/
├── api-server/
│   └── dist/
│       └── index.mjs          ← serwer Node.js
└── web/
    └── dist/
        └── public/
            ├── index.html     ← frontend SPA
            ├── assets/        ← JS/CSS bundle
            ├── images/        ← hero-bg.png
            └── favicon.svg
```
