# Nexus Sight — League of Legends Stats Checker

## Overview
TypeScript pnpm monorepo, fully in Polish. Users search players by Riot ID across regions to view ranked stats, match history, champion mastery, deep gameplay analysis, live game detection, and a dedicated live game page.

## Architecture
- **Frontend**: React + Vite (`artifacts/web`), wouter for routing, TanStack React Query, Framer Motion
- **Backend**: Express API server (`artifacts/api-server`), connects to Riot Games API
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`); tables: `users`, `usage`
- **Auth**: email + bcrypt password, JWT in httpOnly cookie (`SESSION_SECRET` env or auto-generated `.local/session-secret`); admin whitelist by email in `routes/auth.ts`
- **Daily limits per user** (admin = unlimited): search 3/day, ai_analysis 1/day, optimizer 2/day (shared with live-insights). Reset by UTC date. Enforced via `requireUsage(feature)` middleware in `middlewares/auth.ts`
- **Desktop Overlay**: Electron + React (`artifacts/lol-overlay`) — Windows nakładka na LoL, LCU API integration
- **Shared**: OpenAPI spec (`lib/api-spec/openapi.yaml`) → codegen to `lib/api-client-react` and `lib/api-zod`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen`

## Routes
- `/` — Home page with search + FAQ + about section
- `/profile/:region/:gameName/:tagLine` — Player profile (stats, matches, analysis)
- `/ai-analysis/:region/:gameName/:tagLine` — AI Analiza Gracza (NVIDIA Llama 3.1 8B full report)
- `/live/:region/:gameName/:tagLine` — Live game page (OP.GG-style team view)
- `/champion/:region/:gameName/:tagLine/:championName` — Champion detail page (KDA, WR, builds, matchups)
- `/promo` — TikTok promo page
- `/privacy` — Polityka Prywatności (Google AdSense compliance)
- `/terms` — Regulamin
- `/about` — O nas / kontakt
- `/poradnik` — Poradnik analizy statystyk (original Polish LoL guide content for SEO)

## Design System
- Theme: Clean light mode
- Primary: `hsl(200,90%,38%)` blue
- Background: `hsl(220,20%,97%)` light gray
- Cards: white with `hsl(220,15%,88%)` borders, subtle shadows
- Fonts: Barlow Condensed (display/numbers), Rajdhani (labels/buttons), Inter (body)
- CSS utilities: `.glow-cyan`, `.neon-border`, `.tag-chip`, `.search-btn`, `.grid-bg`, `.scanline-card`
- All content in Polish

## Key Files
- `artifacts/web/src/index.css` — Design system CSS (includes .prose-custom for legal pages)
- `artifacts/web/src/lib/constants.ts` — DD version helpers: `setDDVersion`, `getDDVersion`, `getDDBase()`
- `artifacts/web/src/pages/home.tsx` — Homepage (with FAQ section)
- `artifacts/web/src/pages/profile.tsx` — Player profile (champion breakdown and mastery link to champion page)
- `artifacts/web/src/pages/live.tsx` — Live game page
- `artifacts/web/src/pages/champion.tsx` — Champion detail page (KDA, WR, item builds, matchups, history)
- `artifacts/web/src/pages/privacy.tsx` — Privacy Policy page
- `artifacts/web/src/pages/terms.tsx` — Terms of Service page
- `artifacts/web/src/pages/about.tsx` — About page
- `artifacts/web/src/components/Footer.tsx` — Global footer with legal links
- `artifacts/api-server/src/lib/cache.ts` — In-memory TTL cache (60–300s per endpoint)
- `artifacts/api-server/src/lib/ddragon.ts` — Auto-fetches latest Data Dragon version (refreshes every 6h)
- `artifacts/api-server/src/lib/riot-fetch.ts` — Riot API wrapper with 429 retry logic (respects Retry-After)
- `artifacts/api-server/src/routes/summoner.ts` — All Riot API endpoints (uses cache + riot-fetch)
- `artifacts/api-server/src/routes/champion.ts` — Champion detail endpoint `/api/summoner/:puuid/champion/:name`
- `artifacts/api-server/src/routes/analysis.ts` — Analysis engine (~1000 lines, 27+ algorithms including rank benchmarks, improvement roadmap, comeback/snowball analysis, skillshot stats, match performance timeline)
- `lib/api-spec/openapi.yaml` — API spec (source of truth)
- `artifacts/web/src/pages/guide.tsx` — Poradnik page (LoL stats guide with KDA/CS/Vision/rank benchmarks)
- `artifacts/api-server/src/routes/ai-analysis.ts` — NVIDIA AI report engine: fetches 20 matches, computes aggregated stats, builds prompt with performance_radar/improvement_priorities/key_weaknesses_detailed/biggest_mistake_pattern/best_habit fields. Returns `{ report, stats, generatedAt }` — stats used for real-data visualizations.
- `artifacts/web/src/pages/ai-analysis.tsx` — AI Analysis page: rich visualizations (StatsDashboard, RecentResultsBar, PerformanceRadar, ChampPoolVisual, ImprovementPriorities, KeyWeaknessCards, AnalysisProseCard). All prose sections now have colored icon headers.
- `artifacts/web/src/lib/buildAlgorithm.ts` — Pure algorithm for build recommendations: champion DB (~140 champions with class/damageType/tags), analyzeEnemyTeam(), calculateBuild(). Returns items + runes based on enemy composition. No AI, all algorithmic logic.
- `artifacts/web/src/components/BuildCalculator.tsx` — Build Calculator UI: champion picker modal with DDragon icons, enemy team slots (5x), result panel with items/boots/situational/runes with full icon support. Integrated as sub-tab in profile "Mecze" section.

## AdSense & SEO
- Google AdSense publisher ID: `ca-pub-7717242133259434`
- AdSense script loads only after GDPR cookie consent (CookieConsent.tsx)
- AdBanner component polls consent state and initializes ads reactively
- ads.txt verified at `artifacts/web/public/ads.txt`
- Dynamic page titles per route via `usePageTitle` hook (`artifacts/web/src/lib/usePageTitle.ts`)
- Ad placements: home (2x), profile sidebar, AI analysis page
- Structured data: WebApplication + FAQPage schemas in index.html
- Noscript fallback with full SEO content in index.html for crawlers
- sitemap.xml and robots.txt in `artifacts/web/public/`

## Important Notes
- Never edit generated files in `lib/api-zod/src/generated/` — but `lib/api-client-react/src/generated/api.ts` was intentionally patched to add `OptQuery<T,E,D>` type alias for TanStack Query v5 compatibility (queryKey optional in hook options)
- `lib/api-zod/src/index.ts` exports ONLY from `./generated/api` (not from `./generated/types`) — types and Zod schemas share the same names causing ambiguity if both are exported
- After editing any `lib/*/src/*.ts`, rebuild declarations: `cd lib/<pkg> && pnpm exec tsc -p tsconfig.json`
- `refetchInterval` in react-query v5 does NOT work on errored queries — use `useEffect + setInterval + refetch()` workaround
- DD version is fetched dynamically at runtime via `/api/ddragon-version`; use `getDDBase()` in new frontend code, NEVER use the `DD` constant or hardcode version (it's stale at `14.24.1`)
- Cache: all Riot API endpoints are cached server-side (search=60s, ranked=120s, matches=90s, mastery=300s, analysis=120s, live=30s, champion=180s)
- `pushHistory` defined in BOTH home.tsx and profile.tsx (intentional duplicates)
- `Link` from wouter renders its own `<a>` — never wrap in plain `<a>`
- Workflows: "Start application" runs both API server (port 8080) and web (PORT env var); individual artifact workflows also exist
- Champion names in `buildAlgorithm.ts` CHAMP_DB must match DataDragon IDs exactly (e.g. "MasterYi" not "Masteryi")
