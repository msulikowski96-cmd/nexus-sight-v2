import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { riotFetch } from "../lib/riot-fetch";
import { cache } from "../lib/cache";
import { getChampionName } from "../lib/ddragon";
import { requireUsage } from "../middlewares/auth";

const nvidiaClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY ?? "",
});

const router: IRouter = Router();

const REGION_TO_CLUSTER: Record<string, string> = {
  NA1: "americas", BR1: "americas", LA1: "americas", LA2: "americas",
  KR: "asia", JP1: "asia",
  EUW1: "europe", EUN1: "europe", TR1: "europe", RU: "europe",
  OC1: "sea", PH2: "sea", SG2: "sea", TH2: "sea", TW2: "sea", VN2: "sea",
};

const TIER_PL: Record<string, string> = {
  IRON: "Żelazo", BRONZE: "Brąz", SILVER: "Srebro", GOLD: "Złoto",
  PLATINUM: "Platyna", EMERALD: "Szmaragd", DIAMOND: "Diament",
  MASTER: "Mistrz", GRANDMASTER: "Arcymistrz", CHALLENGER: "Challenger",
  UNRANKED: "Bez rangi",
};

function r2(n: number) { return Math.round(n * 100) / 100; }
function pct(n: number) { return `${Math.round(n * 10) / 10}%`; }

async function fetchInternalData(
  puuid: string,
  region: string,
  signal?: AbortSignal,
  shouldStop?: () => boolean
) {
  const isStopped = () => signal?.aborted || shouldStop?.() === true;
  if (isStopped()) throw new Error("Request aborted");

  const cluster = REGION_TO_CLUSTER[region.toUpperCase()] ?? "europe";

  const [rankedRes, masteryRes, matchIdsRes] = await Promise.all([
    riotFetch(`https://${region.toLowerCase()}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, undefined, signal),
    riotFetch(`https://${region.toLowerCase()}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=7`, undefined, signal),
    riotFetch(`https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20&type=ranked`, undefined, signal),
  ]);

  const ranked = (await rankedRes.json()) as any[];
  const masteryRaw = (await masteryRes.json()) as any[];
  const matchIds = (await matchIdsRes.json()) as string[];

  const soloQ = ranked.find((e: any) => e.queueType === "RANKED_SOLO_5x5");
  const flexQ = ranked.find((e: any) => e.queueType === "RANKED_FLEX_5x5");

  const mastery = masteryRaw.map((m: any) => ({
    championName: getChampionName(m.championId),
    championLevel: m.championLevel,
    championPoints: m.championPoints,
    lastPlayTime: m.lastPlayTime,
  }));

  const BATCH = 20;
  const matchDetails: any[] = [];
  for (let i = 0; i < matchIds.length; i += BATCH) {
    if (isStopped()) throw new Error("Request aborted");
    const batch = matchIds.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          if (isStopped()) return null;
          const r = await riotFetch(`https://${cluster}.api.riotgames.com/lol/match/v5/matches/${id}`, undefined, signal);
          return await r.json();
        } catch { return null; }
      })
    );
    matchDetails.push(...results.filter(Boolean));
  }

  const parsedMatches = matchDetails
    .map((md: any) => {
      const p = (md.info?.participants ?? []).find((x: any) => x.puuid === puuid);
      if (!p) return null;
      const all: any[] = md.info?.participants ?? [];
      const myTeam = all.filter((x: any) => x.teamId === p.teamId);
      const teamKills = myTeam.reduce((s: number, x: any) => s + (x.kills ?? 0), 0);
      const teamDmg = myTeam.reduce((s: number, x: any) => s + (x.totalDamageDealtToChampions ?? 0), 0);
      const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
      const gd = md.info.gameDuration as number;
      return {
        win: p.win,
        championName: p.championName,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        assists: p.assists ?? 0,
        cs,
        csPerMin: gd > 0 ? r2((cs / gd) * 60) : 0,
        visionScore: p.visionScore ?? 0,
        damage: p.totalDamageDealtToChampions ?? 0,
        damagePct: teamDmg > 0 ? r2(((p.totalDamageDealtToChampions ?? 0) / teamDmg) * 100) : 0,
        killParticipation: teamKills > 0 ? r2(((p.kills + p.assists) / teamKills) * 100) : 0,
        gold: p.goldEarned ?? 0,
        goldPerMin: gd > 0 ? r2((p.goldEarned / gd) * 60) : 0,
        gameDuration: gd,
        position: p.teamPosition ?? "",
        wardsPlaced: p.wardsPlaced ?? 0,
        controlWards: p.visionWardsBoughtInGame ?? 0,
        firstBlood: p.firstBloodKill ?? false,
        objectivesStolen: p.objectivesStolen ?? 0,
        doubleKills: p.doubleKills ?? 0,
        tripleKills: p.tripleKills ?? 0,
        pentaKills: p.pentaKills ?? 0,
        timeDeadPct: gd > 0 ? r2(((p.totalTimeSpentDead ?? 0) / gd) * 100) : 0,
        physicalDmgPct: p.physicalDamageDealtToChampions && p.totalDamageDealtToChampions > 0
          ? r2((p.physicalDamageDealtToChampions / p.totalDamageDealtToChampions) * 100) : 0,
        magicDmgPct: p.magicDamageDealtToChampions && p.totalDamageDealtToChampions > 0
          ? r2((p.magicDamageDealtToChampions / p.totalDamageDealtToChampions) * 100) : 0,
      };
    })
    .filter(Boolean) as any[];

  const N = parsedMatches.length;
  if (N === 0) return { soloQ, flexQ, mastery, parsedMatches, aggregated: null };

  const wins = parsedMatches.filter((m) => m.win).length;
  const avg = (key: string) => r2(parsedMatches.reduce((s, m) => s + m[key], 0) / N);

  const champMap: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
  for (const m of parsedMatches) {
    if (!champMap[m.championName]) champMap[m.championName] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    champMap[m.championName].games++;
    if (m.win) champMap[m.championName].wins++;
    champMap[m.championName].kills += m.kills;
    champMap[m.championName].deaths += m.deaths;
    champMap[m.championName].assists += m.assists;
  }
  const champStats = Object.entries(champMap)
    .map(([name, s]) => ({
      name,
      games: s.games,
      winRate: r2((s.wins / s.games) * 100),
      kda: s.deaths === 0 ? r2(s.kills + s.assists) : r2((s.kills + s.assists) / s.deaths),
      avgKills: r2(s.kills / s.games),
      avgDeaths: r2(s.deaths / s.games),
      avgAssists: r2(s.assists / s.games),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  const roleMap: Record<string, number> = {};
  for (const m of parsedMatches) if (m.position) roleMap[m.position] = (roleMap[m.position] ?? 0) + 1;
  const primaryRole = Object.entries(roleMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  const streakArr = parsedMatches.map((m) => m.win ? "W" : "L");
  let streak = 1;
  for (let i = 1; i < streakArr.length; i++) {
    if (streakArr[i] === streakArr[0]) streak++;
    else break;
  }
  const streakStr = `${streak}× ${streakArr[0] === "W" ? "wygrana" : "przegrana"}`;

  const recent5 = parsedMatches.slice(0, 5);
  const recent5wr = r2((recent5.filter((m) => m.win).length / recent5.length) * 100);
  const recent10 = parsedMatches.slice(0, 10);
  const recent10wr = r2((recent10.filter((m) => m.win).length / Math.max(recent10.length, 1)) * 100);

  const tiltedGames = parsedMatches.filter((m) => m.deaths > 8).length;
  const pentasTotal = parsedMatches.reduce((s, m) => s + m.pentaKills, 0);
  const multiKills = parsedMatches.reduce((s, m) => s + m.doubleKills + m.tripleKills * 2 + m.pentaKills * 5, 0);

  const avgDamagePerMin = r2(parsedMatches.reduce((s, m) => s + (m.gameDuration > 0 ? (m.damage / m.gameDuration) * 60 : 0), 0) / N);
  const avgVisionPerMin = r2(parsedMatches.reduce((s, m) => s + (m.gameDuration > 0 ? (m.visionScore / m.gameDuration) * 60 : 0), 0) / N);

  const aggregated = {
    totalGames: N,
    winRate: r2((wins / N) * 100),
    avgKda: avg("kills") === 0 && avg("deaths") === 0 ? 0
      : avg("deaths") === 0 ? r2(avg("kills") + avg("assists"))
      : r2((avg("kills") + avg("assists")) / avg("deaths")),
    avgKills: avg("kills"),
    avgDeaths: avg("deaths"),
    avgAssists: avg("assists"),
    avgCsPerMin: avg("csPerMin"),
    avgVisionScore: avg("visionScore"),
    avgDamagePct: avg("damagePct"),
    avgKillParticipation: avg("killParticipation"),
    avgGoldPerMin: avg("goldPerMin"),
    avgTimeDeadPct: avg("timeDeadPct"),
    avgControlWards: avg("controlWards"),
    avgWardsPlaced: avg("wardsPlaced"),
    avgObjectivesStolen: avg("objectivesStolen"),
    avgDamagePerMin,
    avgVisionPerMin,
    primaryRole,
    roleDistribution: roleMap,
    champStats,
    streakStr,
    recent5wr,
    recent10wr,
    tiltedGames,
    pentasTotal,
    multiKills,
    physicalDmgPct: avg("physicalDmgPct"),
    magicDmgPct: avg("magicDmgPct"),
    lastResults: streakArr.slice(0, 15).join(""),
  };

  return { soloQ, flexQ, mastery, parsedMatches, aggregated };
}

function buildPrompt(data: Awaited<ReturnType<typeof fetchInternalData>>, gameName: string): string {
  const { soloQ, flexQ, mastery, aggregated } = data;

  const rankStr = soloQ
    ? `${TIER_PL[soloQ.tier] ?? soloQ.tier} ${soloQ.rank} ${soloQ.leaguePoints} LP (SoloQ, ${soloQ.wins}W ${soloQ.losses}L, WR: ${r2((soloQ.wins / (soloQ.wins + soloQ.losses)) * 100)}%)`
    : "Bez rangi w SoloQ";
  const flexStr = flexQ
    ? `${TIER_PL[flexQ.tier] ?? flexQ.tier} ${flexQ.rank} ${flexQ.leaguePoints} LP (Flex, ${flexQ.wins}W ${flexQ.losses}L)`
    : "Bez rangi w Flex";

  const masteryStr = mastery.slice(0, 5)
    .map((m) => `${m.championName} (poz. ${m.championLevel}, ${(m.championPoints / 1000).toFixed(0)}K pts)`)
    .join(", ");

  let statsStr = "Brak wystarczających danych ze starszych meczy.";
  let champPoolStr = "";
  let lastResultsStr = "";

  if (aggregated) {
    const a = aggregated;
    statsStr = `
Ostatnie ${a.totalGames} meczów rankingowych:
- Win Rate: ${pct(a.winRate)} (ostatnie 5: ${pct(a.recent5wr)}, ostatnie 10: ${pct(a.recent10wr)})
- Śr. KDA: ${a.avgKda} (${a.avgKills}/${a.avgDeaths}/${a.avgAssists})
- Śr. CS/min: ${a.avgCsPerMin}
- Śr. udział w zabójstwach: ${pct(a.avgKillParticipation)}
- Śr. % obrażeń w drużynie: ${pct(a.avgDamagePct)}
- Śr. złoto/min: ${a.avgGoldPerMin}
- Śr. vision score: ${a.avgVisionScore}
- Śr. % czasu martwym: ${pct(a.avgTimeDeadPct)}
- Śr. Control Wards/mecz: ${a.avgControlWards}
- Śr. Wards postawionych: ${a.avgWardsPlaced}
- Śr. skradzionych celów: ${a.avgObjectivesStolen}
- Obrażenia fizyczne/magiczne: ${pct(a.physicalDmgPct)} fiz. / ${pct(a.magicDmgPct)} mag.
- Główna rola: ${a.primaryRole} | Rozkład ról: ${JSON.stringify(a.roleDistribution)}
- Mecze z tiltingiem (>8 zgonów): ${a.tiltedGames}/${a.totalGames}
- Multi-kills (penta: ${a.pentasTotal}, łącznie: ${a.multiKills})`;

    champPoolStr = a.champStats.map((c) =>
      `  ${c.name}: ${c.games}G, ${c.winRate}% WR, ${c.kda} KDA (${c.avgKills}/${c.avgDeaths}/${c.avgAssists})`
    ).join("\n");

    lastResultsStr = `Ostatnie wyniki (W=wygrana, L=przegrana): ${a.lastResults}`;
  }

  const tierBenchmarks: Record<string, { kda: number; csPerMin: number; visionPerMin: number; kp: number; dmgPerMin: number; deaths: number }> = {
    IRON:        { kda: 1.6, csPerMin: 3.8, visionPerMin: 0.25, kp: 42, dmgPerMin: 550, deaths: 7.2 },
    BRONZE:      { kda: 2.0, csPerMin: 4.5, visionPerMin: 0.35, kp: 46, dmgPerMin: 620, deaths: 6.5 },
    SILVER:      { kda: 2.4, csPerMin: 5.2, visionPerMin: 0.42, kp: 50, dmgPerMin: 700, deaths: 5.8 },
    GOLD:        { kda: 2.8, csPerMin: 5.8, visionPerMin: 0.50, kp: 54, dmgPerMin: 780, deaths: 5.2 },
    PLATINUM:    { kda: 3.2, csPerMin: 6.3, visionPerMin: 0.58, kp: 57, dmgPerMin: 850, deaths: 4.7 },
    EMERALD:     { kda: 3.6, csPerMin: 6.8, visionPerMin: 0.65, kp: 60, dmgPerMin: 920, deaths: 4.2 },
    DIAMOND:     { kda: 4.0, csPerMin: 7.2, visionPerMin: 0.72, kp: 63, dmgPerMin: 980, deaths: 3.8 },
    MASTER:      { kda: 4.5, csPerMin: 7.6, visionPerMin: 0.80, kp: 65, dmgPerMin: 1050, deaths: 3.4 },
    GRANDMASTER: { kda: 5.0, csPerMin: 8.0, visionPerMin: 0.85, kp: 67, dmgPerMin: 1100, deaths: 3.1 },
    CHALLENGER:  { kda: 5.5, csPerMin: 8.5, visionPerMin: 0.90, kp: 70, dmgPerMin: 1200, deaths: 2.8 },
  };

  const playerTier = soloQ?.tier && soloQ.tier !== "UNRANKED" ? soloQ.tier : "SILVER";
  const bench = tierBenchmarks[playerTier] ?? tierBenchmarks.SILVER;
  const tierPl = TIER_PL[playerTier] ?? playerTier;

  let benchmarkStr = "";
  if (aggregated) {
    const a = aggregated;
    const cmp = (stat: string, val: number, avg: number, unit: string = "", inverse = false) => {
      const diff = inverse ? ((avg - val) / avg) * 100 : ((val - avg) / avg) * 100;
      const sign = diff >= 0 ? "+" : "";
      return `${stat}: Twoje ${val}${unit} vs średnia ${tierPl}: ${avg}${unit} (${sign}${Math.round(diff)}%)`;
    };
    benchmarkStr = `
PORÓWNANIE ZE ŚREDNIĄ DLA RANGI ${tierPl.toUpperCase()}:
- ${cmp("KDA", a.avgKda, bench.kda)}
- ${cmp("CS/min", a.avgCsPerMin, bench.csPerMin)}
- ${cmp("Kill Participation", a.avgKillParticipation, bench.kp, "%")}
- ${cmp("Obrażenia/min", a.avgDamagePerMin, bench.dmgPerMin)}
- ${cmp("Śmierci/mecz", a.avgDeaths, bench.deaths, "", true)}
- ${cmp("Wizja/min", a.avgVisionPerMin, bench.visionPerMin)}`;
  }

  return `Analityk LoL. Raport gracza "${gameName}" po polsku. Odpowiedz TYLKO JSON (bez markdown).

DANE:
Rangi: SoloQ: ${rankStr} | Flex: ${flexStr}
Mastery: ${masteryStr || "brak"}
${statsStr}
Pool: ${champPoolStr || "brak"}
${lastResultsStr}
${benchmarkStr}

WAŻNE ZASADY:
1. W KAŻDEJ rekomendacji i analizie PODAWAJ KONKRETNE LICZBY gracza, porównania procentowe ze średnią rangi i benchmarki.
2. Zamiast "popraw farmę" pisz "Twoje CS/min: ${aggregated?.avgCsPerMin ?? "X"} vs średnia ${tierPl}: ${bench.csPerMin} (${aggregated ? Math.round(((aggregated.avgCsPerMin - bench.csPerMin) / bench.csPerMin) * 100) : "X"}%) — skup się na..."
3. Zamiast "za dużo giniesz" pisz "Śr. ${aggregated?.avgDeaths ?? "X"} śmierci/mecz vs ${bench.deaths} dla ${tierPl} — to ${aggregated ? Math.round(((aggregated.avgDeaths - bench.deaths) / bench.deaths) * 100) : "X"}% więcej..."
4. coaching_tips muszą zawierać: aktualną wartość gracza, średnią rangi, % różnicy, i konkretny cel do osiągnięcia.
5. improvement_priorities: current i target muszą mieć wartości liczbowe z jednostkami (np. "5.2 CS/min", "KDA 2.1").

JSON (KAŻDE pole z konkretnymi liczbami i porównaniami z rangą ${tierPl}):
{
  "executive_summary": "2 zdania: ranga, WR, kluczowe statystyki vs średnia rangi z liczbami",
  "overall_rating": "JEDNA ocena — dokładnie jeden z: S+, S, A+, A, B+, B, C+, C, D",
  "overall_score": 75,
  "form_assessment": "JEDNA wartość — dokładnie jedna z: Świetna forma, Dobra forma, Stabilna, Zmienna, Słaba forma, Kryzys",
  "playstyle_archetype": "np. Agresywny Top",
  "playstyle_description": "1-2 zdania z liczbami KDA, KP%, DMG%",
  "champion_pool_analysis": "1-2 zdania z WR% per champion i liczbami gier",
  "macro_analysis": "1-2 zdania: vision X vs średnia rangi Y (±Z%), kontrola celów",
  "micro_analysis": "1-2 zdania: CS/min X vs Y dla ${tierPl} (±Z%), DMG/min",
  "lane_phase_analysis": "1 zdanie z first blood %, solo kills, CS advantage",
  "teamfight_analysis": "1 zdanie z KP%, DMG share%, multikills",
  "death_analysis": "1 zdanie: śr. X śmierci vs Y dla rangi (±Z%), czas martwy",
  "vision_analysis": "1 zdanie: vision/min X vs Y (±Z%), pink wardy/mecz",
  "mental_game": "1 zdanie z tilt %, konsekwencja, comeback WR",
  "strengths": ["mocna1 z liczbami i porównaniem","mocna2","mocna3"],
  "weaknesses": ["słaba1 z liczbami i porównaniem","słaba2","słaba3"],
  "coaching_tips": [{"title":"","description":"Twoje X vs średnia rangi Y (±Z%). Konkretna wskazówka z celem liczbowym.","priority":"high/medium/low","category":"macro/micro/mental/vision/champion_pool"}],
  "champion_recommendations": [{"champion":"","reason":"krótko z liczbami","synergy":"krótko"}],
  "rank_prediction": "1 zdanie z konkretnymi statystykami do osiągnięcia",
  "consistency_score": 0-100,
  "consistency_comment": "1 zdanie z wariancją KDA i porównaniem",
  "motivation_quote": "krótkie motto",
  "performance_radar": {"makro":0-100,"mikro":0-100,"wizja":0-100,"konsekwencja":0-100,"teamfight":0-100,"laning":0-100},
  "improvement_priorities": [{"rank":1,"area":"","current":"wartość liczbowa z jednostką","target":"cel liczbowy z jednostką i nazwa rangi","description":"Twoje X vs Y dla ${tierPl}. Konkretna porada.","lp_gain_estimate":0}],
  "key_weaknesses_detailed": [{"title":"","stat":"wartość vs benchmark","impact":"skutek z liczbami","fix":"konkretna porada z celem liczbowym"}],
  "biggest_mistake_pattern": "1 zdanie z liczbami i % meczy",
  "best_habit": "1 zdanie z liczbami i porównaniem"
}
coaching_tips: 3, champion_recommendations: 2, improvement_priorities: 3, key_weaknesses_detailed: 2. Radar 0-100, zróżnicowany.`;
}

router.get("/:puuid/ai-report", requireUsage("ai_analysis"), async (req, res) => {
  const { puuid } = req.params;
  const { region, gameName } = req.query as { region: string; gameName?: string };

  if (!region) {
    res.status(400).json({ error: "bad_request", message: "region is required" });
    return;
  }

  const cacheKey = `ai-report:${region.toUpperCase()}:${puuid}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const timeoutMs = 120_000;
  const controller = new AbortController();
  let timedOut = false;
  const isClosed = () => res.headersSent || req.socket?.destroyed;
  const abortWithReason = (reason: string) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  const onClientClosed = () => abortWithReason("Client disconnected");
  let timeoutHandle: NodeJS.Timeout | null = null;
  req.on("close", onClientClosed);

  try {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      abortWithReason("AI generation timed out");
    }, timeoutMs);

    const mainPromise = (async (): Promise<{ data: Awaited<ReturnType<typeof fetchInternalData>>; parsed: any }> => {
      const t0 = Date.now();
      const data = await fetchInternalData(puuid, region.toUpperCase(), controller.signal, isClosed);
      if (isClosed()) return { data, parsed: { error: "request_closed" } };
      console.log(`[ai-report] data fetch: ${Date.now() - t0}ms`);

      const prompt = buildPrompt(data, gameName ?? "Gracz");

      const t1 = Date.now();
      const nvidiaParams: any = {
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 4096,
        stream: true,
      };
      const stream = await nvidiaClient.chat.completions.create(nvidiaParams, {
        signal: controller.signal,
      }) as any;

      let fullText = "";
      const abortStream = async () => {
        try {
          if (typeof stream?.controller?.abort === "function") stream.controller.abort();
          if (typeof stream?.return === "function") await stream.return();
        } catch {
          // no-op
        }
      };
      controller.signal.addEventListener("abort", () => {
        void abortStream();
      }, { once: true });

      for await (const chunk of stream) {
        if (controller.signal.aborted || isClosed()) {
          await abortStream();
          throw new Error(timedOut ? "AI generation timed out" : "Request aborted");
        }
        const content = chunk?.choices?.[0]?.delta?.content;
        if (content) fullText += content;
      }
      console.log(`[ai-report] AI generation: ${Date.now() - t1}ms, tokens out: ~${Math.round(fullText.length / 4)}`);

      const rawText = fullText
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/```\s*$/m, "")
        .trim();

      let parsed: any;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "parse_failed" };
      } catch {
        parsed = { error: "parse_failed" };
      }

      return { data, parsed };
    })();

    const { data, parsed } = await mainPromise;

    if (isClosed()) return;

    const result = {
      report: parsed,
      generatedAt: Date.now(),
      stats: data.aggregated ? {
        totalGames: data.aggregated.totalGames,
        winRate: data.aggregated.winRate,
        avgKda: data.aggregated.avgKda,
        avgKills: data.aggregated.avgKills,
        avgDeaths: data.aggregated.avgDeaths,
        avgAssists: data.aggregated.avgAssists,
        avgCsPerMin: data.aggregated.avgCsPerMin,
        avgVisionScore: data.aggregated.avgVisionScore,
        avgDamagePct: data.aggregated.avgDamagePct,
        avgKillParticipation: data.aggregated.avgKillParticipation,
        avgGoldPerMin: data.aggregated.avgGoldPerMin,
        avgTimeDeadPct: data.aggregated.avgTimeDeadPct,
        avgControlWards: data.aggregated.avgControlWards,
        avgWardsPlaced: data.aggregated.avgWardsPlaced,
        tiltedGames: data.aggregated.tiltedGames,
        recent5wr: data.aggregated.recent5wr,
        recent10wr: data.aggregated.recent10wr,
        lastResults: data.aggregated.lastResults,
        champStats: data.aggregated.champStats,
        primaryRole: data.aggregated.primaryRole,
        streakStr: data.aggregated.streakStr,
        pentasTotal: data.aggregated.pentasTotal,
        multiKills: data.aggregated.multiKills,
        physicalDmgPct: data.aggregated.physicalDmgPct,
        magicDmgPct: data.aggregated.magicDmgPct,
      } : null,
    };
    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (err: any) {
    const isClosed = res.headersSent || req.socket?.destroyed;
    if (isClosed) return;
    const isTimeout = timedOut || err?.name === "AbortError" || err?.message?.includes("timed out");
    res.status(isTimeout ? 408 : 500).json({
      error: isTimeout ? "timeout" : "ai_error",
      message: err?.message ?? "Unknown error",
    });
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    req.off("close", onClientClosed);
  }
});

export default router;
