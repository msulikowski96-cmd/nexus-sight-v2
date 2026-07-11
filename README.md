# Nexus Sight — Statystyki graczy League of Legends

Nexus Sight to darmowe, polskojęzyczne narzędzie do analizy statystyk graczy League of Legends. Łączy oficjalne API Riot Games z analizą AI opartą na Google Gemini, dając graczom głęboki wgląd w ich styl gry, mocne i słabe strony oraz wskazówki coachingowe.

---

## Funkcje

### Profil gracza
- Wyszukiwanie dowolnego gracza po Riot ID (nazwa + tag) na 16 serwerach regionalnych
- Wyświetlanie avatara, poziomu konta, aktualnej rangi SoloQ i Flex
- Historia LP — wykres liniowy pokazujący zmiany rankingowe między wizytami
- Mistrzostwo bohaterów (top 7) z punktami i poziomem mistrzostwa

### Analiza statystyk
Własny system analizy oparty na ostatnich meczach gracza oblicza 12+ wskaźników:

| Wskaźnik | Co mierzy |
|---|---|
| OP Score | Ogólna ocena wydajności (0–100) |
| KDA Index | Zabójstwa + asysty vs zgony |
| Kill Participation | % zabójstw drużyny, w których gracz uczestniczył |
| Vision Score | Wardowanie i kontrola mapy |
| CS/min | Farma na minutę |
| Damage Share | % obrażeń drużyny zadanych przez gracza |
| Early Game Score | Dominacja w fazie laningowej |
| Objective Control | Smoki, Baron, Rift Herald |
| Tilt Index | Czy forma gracza się pogarsza po przegranej |
| Playstyle Archetype | Automatyczne wykrycie stylu (Assassin Carry, Tank Initiator itd.) |
| Role Detection | Wykrywanie granej roli na podstawie statystyk |
| Predicted Tier | Szacowana ranga AI na podstawie stylu gry |

### Historia meczy
- Ostatnie 20 meczów ze szczegółami: champion, rola, KDA, CS, obrażenia, czas gry
- Tryb budowania przedmiotów i run
- Skład obu drużyn z miniaturkami championów
- OP Score dla każdego meczu
- Link do szczegółowego widoku meczu z pełnymi statystykami wszystkich 10 graczy

### Szczegóły meczu
- Pełna tabela z 10 graczami podzielonymi na dwie drużyny
- Porównanie gracza z bezpośrednim przeciwnikiem z tej samej lane
- Wykresy: obrażenia, vision score, CS

### Strona championa
- Statystyki gracza dla konkretnego bohatera (tylko rankingowe mecze)
- Win rate, KDA, średnie CS, obrażenia, czas gry
- Historia ostatnich 20 meczów tym championem
- Budowanie itemów i run z tych meczy

### Live Game — gra na żywo
- Wykrywanie aktywnego meczu w czasie rzeczywistym
- Rangi SoloQ i Flex wszystkich 10 graczy
- Runy, czarownie przywołacza i zakazani championowie
- Timer z aktualnym czasem trwania meczu
- Automatyczne odświeżanie

### AI Analiza (Gemini)
Strona `/ai-analysis` generuje pełny raport AI gracza:
- **Ocena ogólna** (S+, S, A+, A, B, C, D) z numerycznym wynikiem i wskaźnikiem konsekwencji
- **Forma aktualna** (Świetna forma / Kryzys / itd.) + archetyp stylu gry
- **Mocne i słabe strony** — konkretna lista punktów
- **Analiza makro** (mapa, obiektywy), **mikro** (mechanika), **faza laningowa**, **teamfighty**, **zgony**, **vision**, **aspekt mentalny**
- **10 wskazówek coachingowych** z priorytetem (wysoki/średni/niski) i kategorią
- **Polecane championy** pasujące do stylu gry
- **Prognoza rankingowa** — gdzie gracz może dojść w sezonie
- Raport w języku polskim, generowany przez Google Gemini 2.0 Flash
- Cache 5 minut — kolejna wizyta na tej samej stronie nie generuje nowego requestu

### Strona promocyjna
Animowana strona `/promo` prezentująca funkcje aplikacji w formie 13 interaktywnych scen — zaprojektowana jako materiał marketingowy.

---

## Architektura

```
nexus-sight/
├── artifacts/
│   ├── web/                    # Frontend (React + Vite + Tailwind CSS)
│   │   ├── src/
│   │   │   ├── pages/          # Strony aplikacji
│   │   │   │   ├── home.tsx         # Strona główna z wyszukiwarką
│   │   │   │   ├── profile.tsx      # Profil gracza
│   │   │   │   ├── champion.tsx     # Statystyki championa
│   │   │   │   ├── match.tsx        # Szczegóły meczu
│   │   │   │   ├── live.tsx         # Live game
│   │   │   │   ├── ai-analysis.tsx  # Analiza AI
│   │   │   │   ├── promo.tsx        # Strona promocyjna
│   │   │   │   ├── privacy.tsx      # Polityka prywatności
│   │   │   │   ├── terms.tsx        # Regulamin
│   │   │   │   └── about.tsx        # O nas
│   │   │   ├── components/     # Komponenty wielokrotnego użytku
│   │   │   │   ├── CookieConsent.tsx    # Baner GDPR + ładowanie AdSense
│   │   │   │   ├── AdBanner.tsx         # Komponent jednostki reklamowej
│   │   │   │   └── Footer.tsx           # Stopka z linkami
│   │   │   └── lib/            # Helpery (stałe, localStorage utils)
│   │   └── public/
│   │       ├── ads.txt         # Weryfikacja Google AdSense
│   │       ├── robots.txt      # Konfiguracja crawlerów
│   │       ├── sitemap.xml     # Mapa strony dla SEO
│   │       └── riot.txt        # Weryfikacja Riot Games
│   │
│   └── api-server/             # Backend (Node.js + Express + TypeScript)
│       └── src/
│           ├── routes/
│           │   ├── summoner.ts      # Wyszukiwanie gracza, ranga, mastery
│           │   ├── analysis.ts      # Obliczanie wskaźników analitycznych
│           │   ├── match.ts         # Historia i szczegóły meczy
│           │   ├── champion.ts      # Statystyki per champion
│           │   ├── ai-analysis.ts   # Endpoint generowania raportu AI
│           │   └── health.ts        # Health check
│           ├── lib/
│           │   └── riot-fetch.ts    # Klient HTTP Riot API z retry i rate limit
│           └── middlewares/
│               └── rateLimit.ts     # Rate limiting requestów
│
└── lib/
    ├── api-client-react/       # React hooks (useSearchSummoner, useGetSummonerRanked itd.)
    ├── api-spec/               # Specyfikacja OpenAPI
    ├── api-zod/                # Schematy walidacji Zod
    └── integrations-gemini-ai/ # Klient Google Gemini AI
```

---

## Stos technologiczny

### Frontend
| Technologia | Zastosowanie |
|---|---|
| React 18 | Biblioteka UI |
| Vite | Bundler i dev server |
| Tailwind CSS v4 | Stylowanie |
| TypeScript | Typowanie |
| Wouter | Routing (lekka alternatywa dla React Router) |
| Framer Motion | Animacje |
| TanStack Query | Zarządzanie stanem i cache requestów |
| Lucide React | Ikonki |
| Barlow Condensed / Rajdhani / Inter | Fonty (Google Fonts) |

### Backend
| Technologia | Zastosowanie |
|---|---|
| Node.js | Runtime |
| Express | Framework HTTP |
| TypeScript | Typowanie |
| Pino | Logowanie requestów |
| Google Gemini 2.0 Flash | Generowanie raportów AI |
| In-memory cache | Cache odpowiedzi Riot API (5 min) |

### Zewnętrzne API
| API | Do czego |
|---|---|
| Riot Games API | Dane gracza, mecze, live game, rangi, mastery |
| Data Dragon (ddragon) | Obrazki championów, itemów, run, czarowni |
| CommunityDragon | Emblematy rang, dodatkowe assety |
| Google Gemini API | Generowanie raportów AI |
| Google AdSense | Monetyzacja reklamami |

---

## Jak działa przepływ danych

```
Użytkownik wpisuje Riot ID
        ↓
Frontend (React) → GET /api/summoner/search?gameName=&tagLine=&region=
        ↓
API Server → Riot Account API → zwraca PUUID (unikalny ID gracza)
        ↓
Frontend równolegle odpytuje:
  ├── GET /api/summoner/:puuid/ranked      → rangi SoloQ i Flex
  ├── GET /api/summoner/:puuid/matches     → historia 20 meczy
  ├── GET /api/summoner/:puuid/mastery     → top championy
  ├── GET /api/summoner/:puuid/analysis    → obliczone wskaźniki
  └── GET /api/summoner/:puuid/live        → aktywny mecz (jeśli jest)
        ↓
TanStack Query cache'uje odpowiedzi na 5 minut po stronie frontendu
API Server cache'uje odpowiedzi Riot API na 5 minut po stronie serwera
```

### Jak działa AI Analiza

```
GET /api/summoner/:puuid/ai-report?region=&gameName=
        ↓
API Server pobiera dane gracza (rangi, mecze, mastery, analiza wskaźników)
        ↓
Buduje szczegółowy prompt w języku polskim (~2000 tokenów)
        ↓
Wysyła do Google Gemini 2.0 Flash (maxOutputTokens: 16000)
        ↓
Gemini zwraca raport w formacie JSON (stripped z markdown fences)
        ↓
API Server waliduje JSON i cache'uje na 5 minut
        ↓
Frontend renderuje raport w podziale na sekcje (siatka 2 kolumny)
```

---

## Zmienne środowiskowe

### API Server
```env
PORT=8080                          # Port serwera (wymagane)
RIOT_API_KEY=RGAPI-xxx             # Klucz API Riot Games (wymagane)
AI_INTEGRATIONS_GEMINI_API_KEY=... # Klucz API Google Gemini (wymagane dla AI Analizy)
AI_INTEGRATIONS_GEMINI_BASE_URL=... # Opcjonalne — proxy (np. Replit AI Integrations)
```

### Frontend (Vite)
```env
PORT=22333          # Port dev serwera
BASE_PATH=/         # Ścieżka bazowa aplikacji
```

---

## Uruchomienie lokalnie

```bash
# Instalacja zależności
pnpm install

# Uruchomienie obu serwerów jednocześnie
PORT=8080 pnpm --filter @workspace/api-server run dev &
PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev
```

Frontend dostępny na `http://localhost:22333`
API dostępne na `http://localhost:8080`

---

## Endpointy API

| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/summoner/search` | Wyszukiwanie gracza (query: gameName, tagLine, region) |
| GET | `/api/summoner/:puuid/ranked` | Rangi SoloQ i Flex |
| GET | `/api/summoner/:puuid/matches` | Historia meczy (query: region, count) |
| GET | `/api/summoner/:puuid/mastery` | Mistrzostwo championów |
| GET | `/api/summoner/:puuid/analysis` | Obliczone wskaźniki analityczne |
| GET | `/api/summoner/:puuid/live` | Aktywny mecz |
| GET | `/api/summoner/:puuid/champion/:name` | Statystyki per champion |
| GET | `/api/summoner/:puuid/ai-report` | Raport AI (Gemini) |
| GET | `/api/match/:matchId` | Szczegóły pojedynczego meczu |
| GET | `/api/ddragon-version` | Aktualna wersja Data Dragon |

---

## SEO i monetyzacja

- **Google AdSense** — Auto Ads z publisher ID `ca-pub-7717242133259434`. Skrypt ładuje się wyłącznie po wyrażeniu zgody przez użytkownika (baner cookie GDPR).
- **ads.txt** — plik weryfikacyjny dla Google AdSense dostępny pod `/ads.txt`
- **sitemap.xml** — mapa strony z głównymi podstronami
- **robots.txt** — zezwolenie na indeksowanie frontendu, zablokowanie `/api/`
- **Open Graph + Twitter Card** — podglądy linków w mediach społecznościowych

---

## Disclaimer

Nexus Sight nie jest zatwierdzony przez Riot Games i nie odzwierciedla poglądów ani opinii Riot Games ani żadnej osoby oficjalnie zaangażowanej w tworzenie lub zarządzanie właściwościami Riot Games. League of Legends i Riot Games są znakami towarowymi lub zarejestrowanymi znakami towarowymi Riot Games, Inc.
