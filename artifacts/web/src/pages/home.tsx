import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, BarChart3, Zap, Shield, Users, Clock, X, Activity, Heart, Sparkles } from "lucide-react";
import { getFavorites, toggleFavorite, type Favorite } from "@/lib/favorites";
import { usePageTitle } from "@/lib/usePageTitle";
import AdBanner from "@/components/AdBanner";

const HISTORY_KEY = "nexus_sight_history";
const MAX_HISTORY = 8;

type HistoryEntry = { gameName: string; tagLine: string; region: string; ts: number };

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}
export function pushHistory(gameName: string, tagLine: string, region: string) {
  const existing = loadHistory().filter(
    e => !(e.gameName.toLowerCase() === gameName.toLowerCase() && e.tagLine.toLowerCase() === tagLine.toLowerCase() && e.region === region)
  );
  const updated: HistoryEntry[] = [{ gameName, tagLine, region, ts: Date.now() }, ...existing].slice(0, MAX_HISTORY);
  saveHistory(updated);
}

const REGIONS = [
  "EUW1", "NA1", "KR", "EUN1", "BR1", "LA1", "LA2", "OC1", "TR1", "RU", "JP1", "PH2", "SG2", "TW2", "TH2", "VN2"
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "Głęboka analiza",
    desc: "12 wskaźników, archetyp stylu gry, early game, obiektywy, wskaźnik tiltu",
    color: "hsl(200,90%,35%)",
    border: "hsl(200,50%,82%)",
    bg: "hsl(200,50%,97%)",
  },
  {
    icon: Zap,
    title: "Live w meczu",
    desc: "Aktywna gra w czasie rzeczywistym — rangi, runy, czarownie i bany",
    color: "hsl(152,55%,35%)",
    border: "hsl(152,40%,78%)",
    bg: "hsl(152,45%,97%)",
  },
  {
    icon: Shield,
    title: "Historia meczy",
    desc: "KDA, OP Score, skład drużyn i porównanie z oponentem z lane",
    color: "hsl(42,80%,42%)",
    border: "hsl(42,50%,78%)",
    bg: "hsl(42,50%,97%)",
  },
  {
    icon: Users,
    title: "Szacowana ranga",
    desc: "Algorytm AI oblicza realną rangę gracza na podstawie stylu gry",
    color: "hsl(258,60%,50%)",
    border: "hsl(258,40%,82%)",
    bg: "hsl(258,50%,97%)",
  },
];

const TOOLS = [
  {
    href: "/optymalizator",
    icon: Sparkles,
    title: "Optymalizator Build & Run",
    desc: "Wybierz swojego championa + skład wroga → AI generuje runy, sumony i pełny build na ten matchup",
    badge: "AI",
    color: "hsl(280,60%,50%)",
    border: "hsl(280,40%,82%)",
    bg: "hsl(280,50%,97%)",
  },
];

const QUICK_SEARCH = [
  { name: "Faker", tag: "T1", region: "KR" },
  { name: "Caps", tag: "EUW", region: "EUW1" },
];

const FAQ_ITEMS = [
  {
    q: "Jak sprawdzić statystyki gracza League of Legends?",
    a: "Wpisz Riot ID gracza (nazwa i tag, np. Faker#T1) w wyszukiwarkę na stronie głównej, wybierz odpowiedni region i kliknij Szukaj. W ciągu kilku sekund zobaczysz pełny profil gracza z rangami, historią meczy i analizą AI.",
  },
  {
    q: "Czym jest analiza AI w Nexus Sight?",
    a: "Nasza analiza AI to zestaw 22 autorskich algorytmów, które analizują ostatnie mecze gracza i generują unikalne wskaźniki: archetyp stylu gry, wskaźnik tiltu, warunki zwycięstwa, krzywą mocy, analizę early game i spersonalizowane porady coachingowe.",
  },
  {
    q: "Czy Nexus Sight jest darmowy?",
    a: "Tak, Nexus Sight jest całkowicie darmowy. Nie wymaga rejestracji ani logowania. Wystarczy wpisać nazwę gracza i tag, aby zobaczyć pełne statystyki i analizę.",
  },
  {
    q: "Jakie regiony są obsługiwane?",
    a: "Obsługujemy wszystkie oficjalne serwery League of Legends: EUW, EUNE, NA, KR, BR, LAN, LAS, OCE, TR, RU, JP oraz serwery azjatyckie (PH, SG, TW, TH, VN).",
  },
  {
    q: "Co to jest szacowana ranga AI?",
    a: "Szacowana ranga to algorytm, który oblicza realny poziom gracza na podstawie faktycznych statystyk z meczy (CS/min, KDA, kontrola wardów, obiektywna gra), niezależnie od aktualnego LP. Dzięki temu możesz zobaczyć, na jakim poziomie naprawdę grasz.",
  },
  {
    q: "Czy mogę sprawdzić, czy ktoś jest w aktywnej grze?",
    a: "Tak! Nexus Sight automatycznie wykrywa, czy gracz jest w aktywnej grze. Jeśli tak, zobaczysz baner Live Game na profilu z linkiem do szczegółowego podglądu meczu — z rangami, runami, czarowniami i banami wszystkich 10 uczestników.",
  },
  {
    q: "Skąd pochodzą dane?",
    a: "Wszystkie dane pobieramy bezpośrednio z oficjalnego API Riot Games. Są to publicznie dostępne statystyki — dokładnie te same, które widoczne są w kliencie gry i na innych platformach typu OP.GG.",
  },
];

export default function Home() {
  usePageTitle();
  const [, setLocation] = useLocation();
  const [region, setRegion] = useState("EUW1");
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [focused, setFocused] = useState(false);
  const prefetchedRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
    setFavorites(getFavorites());
  }, []);

  const prefetchProfile = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true;
      import("@/pages/profile");
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName || !tagLine) return;
    const name = gameName.trim();
    const tag = tagLine.trim().replace(/^#/, "");
    pushHistory(name, tag, region);
    setHistory(loadHistory());
    setLocation(`/profile/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  };

  const handleQuick = (q: typeof QUICK_SEARCH[number]) => {
    setLocation(`/profile/${q.region}/${encodeURIComponent(q.name)}/${q.tag}`);
  };

  return (
    <div className="relative flex flex-col items-center justify-center px-4 overflow-hidden py-12">

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-background/70 z-5" />
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <div className="z-10 w-full max-w-2xl flex flex-col items-center">

        <motion.div
          initial={{ opacity: 0, y: -28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="relative">
              <div className="w-14 h-14 flex items-center justify-center"
                style={{
                  background: "hsl(200,50%,96%)",
                  border: "1px solid hsl(200,50%,78%)",
                  borderRadius: "8px",
                  boxShadow: "0 2px 12px rgba(0,130,180,0.1)",
                }}>
                <Activity className="w-7 h-7" style={{ color: "hsl(200,90%,35%)" }} />
              </div>
              <div className="corner-accent corner-accent-tl" />
              <div className="corner-accent corner-accent-br" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-black tracking-[0.08em] leading-none text-gradient-cyan"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}>
                NEXUS SIGHT
              </h1>
              <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mt-1"
                style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>
                League of Legends · Analiza Statystyk
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-md mx-auto">
            Sprawdź statystyki każdego gracza — analiza gry, historia meczy, live game i szacowana ranga AI.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSearch}
          className="w-full mb-5"
        >
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 overflow-hidden"
            style={{
              background: "white",
              border: focused ? "1px solid hsl(200,60%,65%)" : "1px solid hsl(220,15%,85%)",
              borderRadius: "10px",
              boxShadow: focused
                ? "0 0 0 3px rgba(0,130,180,0.08), 0 8px 30px rgba(0,0,0,0.08)"
                : "0 4px 20px rgba(0,0,0,0.06)",
              transition: "all 0.2s",
              padding: "6px",
            }}
          >
            <div className="border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0 sm:pr-3 sm:mr-2 mb-2 sm:mb-0">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="w-full sm:w-auto bg-transparent border-none focus:ring-0 cursor-pointer outline-none py-3 px-3 text-sm font-semibold appearance-none"
                style={{ color: "hsl(200,90%,35%)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex flex-1 items-center gap-1 px-2">
              <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nazwa gracza"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                onFocus={() => { setFocused(true); prefetchProfile(); }}
                onBlur={() => setFocused(false)}
                className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:ring-0 outline-none py-3 px-2 text-base min-w-0"
                required
              />
              <span className="text-muted-foreground/30 font-light text-xl select-none">#</span>
              <input
                type="text"
                placeholder="TAG"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="w-20 bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:ring-0 outline-none py-3 px-2 text-base"
                style={{ fontFamily: "'Rajdhani',sans-serif" }}
                required
              />
            </div>

            <button type="submit" className="search-btn flex items-center justify-center gap-2 px-7 py-3.5 rounded-[6px] text-sm group">
              SZUKAJ
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="mb-4 w-full"
        >
          <AnimatePresence>
            {favorites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                  <span className="data-label">Ulubieni gracze</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((f) => (
                    <motion.div
                      key={`${f.gameName}-${f.tagLine}-${f.region}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center gap-0 rounded-[6px] overflow-hidden"
                      style={{ background: "hsl(0,70%,97%)", border: "1px solid hsl(0,55%,88%)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <button
                        onClick={() => setLocation(`/profile/${f.region}/${encodeURIComponent(f.gameName)}/${encodeURIComponent(f.tagLine)}`)}
                        className="text-[11px] px-3 py-1.5 text-left transition-colors hover:bg-red-50"
                        style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 600 }}
                      >
                        <span className="font-bold text-foreground">{f.gameName}</span>
                        <span className="text-red-400">#{f.tagLine}</span>
                        <span className="ml-2 text-[9px] tracking-wider text-muted-foreground">{f.region}</span>
                      </button>
                      <button
                        onClick={() => {
                          toggleFavorite(f);
                          setFavorites(getFavorites());
                        }}
                        className="pr-2.5 pl-1 text-red-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10 w-full"
        >
          {history.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="data-label">Ostatnio wyszukiwani</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {history.map((h) => (
                    <motion.div
                      key={`${h.gameName}-${h.tagLine}-${h.region}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center gap-0 rounded-[6px] overflow-hidden"
                      style={{ background: "white", border: "1px solid hsl(220,15%,88%)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <button
                        onClick={() => setLocation(`/profile/${h.region}/${encodeURIComponent(h.gameName)}/${encodeURIComponent(h.tagLine)}`)}
                        className="text-[11px] px-3 py-1.5 text-left transition-colors hover:bg-muted"
                        style={{ color: "hsl(220,10%,46%)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600 }}
                      >
                        <span className="font-bold text-foreground">{h.gameName}</span>
                        <span className="text-primary">#{h.tagLine}</span>
                        <span className="ml-2 text-[9px] tracking-wider text-muted-foreground">{h.region}</span>
                      </button>
                      <button
                        onClick={() => {
                          const updated = history.filter(e => !(e.gameName === h.gameName && e.tagLine === h.tagLine && e.region === h.region));
                          setHistory(updated);
                          saveHistory(updated);
                        }}
                        className="pr-2.5 pl-1 text-muted-foreground/40 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="data-label">Szybki podgląd:</span>
              {QUICK_SEARCH.map(q => (
                <button
                  key={q.name}
                  onClick={() => handleQuick(q)}
                  className="text-[11px] px-3 py-1.5 rounded-[6px] transition-all hover:scale-105"
                  style={{
                    background: "white",
                    border: "1px solid hsl(220,15%,88%)",
                    color: "hsl(220,10%,46%)",
                    fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 600,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {q.name}<span className="text-primary">#{q.tag}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              className="flex flex-col items-start gap-3 px-3.5 py-4 relative overflow-hidden"
              style={{
                background: f.bg,
                border: `1px solid ${f.border}`,
                borderRadius: "10px",
              }}
            >
              <div className="w-8 h-8 rounded-[6px] flex items-center justify-center"
                style={{ background: "white", border: `1px solid ${f.border}` }}>
                <f.icon className="w-4 h-4" style={{ color: f.color }} />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide mb-1"
                  style={{ fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.06em", color: f.color }}>
                  {f.title}
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* AI Tools section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="w-full mt-6"
        >
          {TOOLS.map((t) => (
            <button
              key={t.title}
              onClick={() => setLocation(t.href)}
              className="group w-full flex items-center gap-4 px-4 py-4 rounded-[10px] text-left transition-all hover:scale-[1.01]"
              style={{
                background: t.bg,
                border: `1px solid ${t.border}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="w-12 h-12 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: "white", border: `1px solid ${t.border}` }}>
                <t.icon className="w-6 h-6" style={{ color: t.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold tracking-wide"
                    style={{ fontFamily: "'Rajdhani',sans-serif", color: t.color }}>
                    {t.title}
                  </p>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                    style={{ background: t.color, color: "white", fontFamily: "'Rajdhani',sans-serif" }}>
                    NOWE · {t.badge}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{t.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: t.color }} />
            </button>
          ))}
        </motion.div>

        <AdBanner slot="2167950293" format="auto" className="w-full mt-10 mb-4" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full mt-12 mb-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-1 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Najczęściej zadawane pytania
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-5">Wszystko, co musisz wiedzieć o Nexus Sight</p>
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <details key={i} className="group glass-panel overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-3 text-[13px] text-muted-foreground leading-relaxed border-t border-border/50 pt-2">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="w-full mt-6 mb-8 glass-panel p-5"
        >
          <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Czym jest Nexus Sight?
          </h2>
          <div className="text-[13px] text-muted-foreground leading-relaxed space-y-3">
            <p>
              Nexus Sight to darmowe, polskojęzyczne narzędzie do analizy statystyk graczy League of Legends.
              Wystarczy wpisać Riot ID dowolnego gracza (nazwa#tag), aby zobaczyć szczegółowe informacje o jego
              rozgrywce — rangi, historię meczy, mistrzostwo bohaterów i głęboką analizę AI.
            </p>
            <p>
              Nasze unikalne algorytmy analizy wykraczają poza standardowe statystyki. Obliczamy archetyp stylu gry
              (np. „Agresywny Carry", „Strażnik Linii"), wskaźnik tiltu, warunki zwycięstwa, krzywą mocy
              (w której fazie gry jesteś najsilniejszy) oraz szacowaną realną rangę opartą na faktycznym poziomie gry.
            </p>
            <p>
              Aplikacja obsługuje wszystkie regiony League of Legends: EUW, EUNE, NA, KR, BR, LAN, LAS, OCE, TR, RU, JP
              oraz serwery azjatyckie. Dane pobieramy bezpośrednio z oficjalnego API Riot Games — bez konieczności logowania.
            </p>
          </div>
        </motion.section>

        <AdBanner slot="7172864968" format="autorelaxed" className="w-full mt-6 mb-4" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 mb-2 flex items-center gap-3"
        >
          <div className="h-px flex-1 max-w-16" style={{ background: "linear-gradient(to right, transparent, hsl(220,15%,85%))" }} />
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/50" style={{ fontFamily: "'Rajdhani',sans-serif" }}>
            Powered by Riot API
          </span>
          <div className="h-px flex-1 max-w-16" style={{ background: "linear-gradient(to left, transparent, hsl(220,15%,85%))" }} />
        </motion.div>
      </div>
    </div>
  );
}
