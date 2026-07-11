import { clamp, ewma, gradeFromScore, mean, shrinkWinRate, stdDev, wilsonLowerBound } from "./stats-utils";

export type AnalysisRole = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";

type ComponentKey = "combat" | "economy" | "teamplay" | "vision" | "survival" | "objectives" | "lane";

export interface MatchDataV2 {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  gameEndTimestamp: number;
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealt: number;
  goldEarned: number;
  cs: number;
  visionScore: number;
  teamKills: number;
  teamDamageDealt: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWardsPlaced: number;
  damageTaken: number;
  selfMitigatedDamage: number;
  soloKills: number;
  turretKills: number;
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  objectivesStolen: number;
  teamPosition: string;
  physicalDamage: number;
  magicDamage: number;
  trueDamage: number;
  timeSpentDead: number;
  longestTimeAlive: number;
  dragonKills: number;
  inhibitorKills: number;
  bountyGold: number;
  maxCsAdvantage: number;
  skillshotsLanded: number;
  skillshotsDodged: number;
  teamDamagePct: number;
  enemyMissedCS: number;
  goldPerMinute: number;
  teamTurretKills: number;
  teamObjectivesStolen: number;
  hadAfkTeammate: boolean;
  wasAfk: boolean;
}

interface RoleTargets {
  kda: number;
  csPerMin: number;
  damagePerMin: number;
  damageShare: number;
  killParticipation: number;
  visionPerMin: number;
  goldPerMin: number;
  deathsPer10: number;
  wardScorePer10: number;
  objectiveActions: number;
  lanePressure: number;
}

interface RoleConfig {
  label: string;
  targets: RoleTargets;
  weights: Record<ComponentKey, number>;
}

interface DerivedMatch {
  source: MatchDataV2;
  role: AnalysisRole;
  durationMinutes: number;
  kda: number;
  csPerMin: number;
  damagePerMin: number;
  damageShare: number;
  killParticipation: number;
  visionPerMin: number;
  goldPerMin: number;
  deathsPer10: number;
  timeDeadPct: number;
  wardScorePer10: number;
  objectiveActions: number;
  lanePressureRaw: number;
  components: Record<ComponentKey, number>;
  performanceScore: number;
}

interface ProfileStats {
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCsPerMin: number;
  avgDamagePerMin: number;
  avgDamageShare: number;
  avgKillParticipation: number;
  avgVisionPerMin: number;
  avgGoldPerMin: number;
  avgTimeDeadPct: number;
  avgWardScorePer10: number;
  avgObjectiveActions: number;
  avgLanePressure: number;
  avgControlWards: number;
  avgSoloKills: number;
  avgTurretKills: number;
  avgDragonKills: number;
  avgObjectivesStolen: number;
  avgInhibitorKills: number;
  avgBountyGold: number;
  avgCsAdvantage: number;
  firstBloodRate: number;
  deathSpikeGames: number;
  mostDeaths: number;
  componentScores: Record<ComponentKey, number>;
  consistencyScore: number;
  recentFormScore: number;
  baselineScore: number;
}

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  combat: "Wpływ bojowy",
  economy: "Ekonomia roli",
  teamplay: "Gra zespołowa",
  vision: "Kontrola informacji",
  survival: "Zarządzanie ryzykiem",
  objectives: "Konwersja obiektywów",
  lane: "Presja we wczesnej grze",
};

const ROLE_CONFIGS: Record<AnalysisRole, RoleConfig> = {
  TOP: {
    label: "Top",
    targets: { kda: 3.0, csPerMin: 7.8, damagePerMin: 720, damageShare: 24, killParticipation: 54, visionPerMin: 0.75, goldPerMin: 405, deathsPer10: 1.8, wardScorePer10: 3.2, objectiveActions: 1.15, lanePressure: 16 },
    weights: { combat: 21, economy: 20, teamplay: 8, vision: 5, survival: 15, objectives: 13, lane: 18 },
  },
  JUNGLE: {
    label: "Jungler",
    targets: { kda: 3.4, csPerMin: 5.6, damagePerMin: 620, damageShare: 20, killParticipation: 70, visionPerMin: 1.05, goldPerMin: 385, deathsPer10: 1.7, wardScorePer10: 4.4, objectiveActions: 1.65, lanePressure: 18 },
    weights: { combat: 13, economy: 10, teamplay: 19, vision: 12, survival: 11, objectives: 24, lane: 11 },
  },
  MIDDLE: {
    label: "Mid",
    targets: { kda: 3.2, csPerMin: 8.1, damagePerMin: 880, damageShare: 27, killParticipation: 63, visionPerMin: 0.85, goldPerMin: 425, deathsPer10: 1.7, wardScorePer10: 3.4, objectiveActions: 0.85, lanePressure: 18 },
    weights: { combat: 25, economy: 19, teamplay: 13, vision: 6, survival: 12, objectives: 8, lane: 17 },
  },
  BOTTOM: {
    label: "ADC",
    targets: { kda: 3.1, csPerMin: 8.7, damagePerMin: 1050, damageShare: 30, killParticipation: 61, visionPerMin: 0.65, goldPerMin: 445, deathsPer10: 1.6, wardScorePer10: 2.7, objectiveActions: 0.65, lanePressure: 15 },
    weights: { combat: 29, economy: 23, teamplay: 12, vision: 3, survival: 18, objectives: 5, lane: 10 },
  },
  UTILITY: {
    label: "Support",
    targets: { kda: 3.6, csPerMin: 1.7, damagePerMin: 330, damageShare: 9, killParticipation: 73, visionPerMin: 2.1, goldPerMin: 285, deathsPer10: 1.75, wardScorePer10: 7.2, objectiveActions: 1.25, lanePressure: 16 },
    weights: { combat: 8, economy: 6, teamplay: 24, vision: 27, survival: 14, objectives: 15, lane: 6 },
  },
  "": {
    label: "Nieznana",
    targets: { kda: 3.2, csPerMin: 7.0, damagePerMin: 760, damageShare: 22, killParticipation: 62, visionPerMin: 1.0, goldPerMin: 400, deathsPer10: 1.75, wardScorePer10: 4.0, objectiveActions: 1.0, lanePressure: 16 },
    weights: { combat: 20, economy: 16, teamplay: 15, vision: 10, survival: 15, objectives: 12, lane: 12 },
  },
};

const round1 = (value: number): number => Math.round(value * 10) / 10;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function resolveRole(role: string | undefined | null): AnalysisRole {
  const normalized = String(role ?? "").toUpperCase();
  if (normalized === "TOP" || normalized === "JUNGLE" || normalized === "MIDDLE" || normalized === "BOTTOM" || normalized === "UTILITY") return normalized;
  return "";
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  let totalWeight = 0;
  values.forEach((value, index) => {
    const weight = weights[index] ?? 0;
    total += value * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? total / totalWeight : mean(values);
}

function ratioScore(value: number, target: number): number {
  if (target <= 0 || value <= 0) return 0;
  const ratio = value / target;
  if (ratio <= 1) return clamp(80 * Math.pow(ratio, 0.72), 0, 80);
  return clamp(80 + 20 * (1 - Math.exp(-1.8 * (ratio - 1))), 0, 100);
}

function lowerIsBetterScore(value: number, target: number): number {
  if (target <= 0) return 50;
  if (value <= target) return clamp(80 + 20 * (1 - Math.exp(-1.5 * ((target - value) / target))), 0, 100);
  const excess = (value - target) / target;
  return clamp(80 * Math.exp(-1.65 * excess), 0, 100);
}

function ratingFromScore(score: number): string {
  if (score >= 88) return "Elitarny";
  if (score >= 76) return "Bardzo mocny";
  if (score >= 64) return "Dobry";
  if (score >= 50) return "Stabilny";
  if (score >= 36) return "Nierówny";
  return "Do poprawy";
}

function deriveMatch(match: MatchDataV2): DerivedMatch {
  const role = resolveRole(match.teamPosition);
  const config = ROLE_CONFIGS[role];
  const durationMinutes = Math.max(match.gameDuration / 60, 1);
  const kda = (match.kills + match.assists) / Math.max(match.deaths, 1);
  const csPerMin = match.cs / durationMinutes;
  const damagePerMin = match.totalDamageDealt / durationMinutes;
  const damageShare = safeDivide(match.totalDamageDealt, match.teamDamageDealt) * 100;
  const killParticipation = safeDivide(match.kills + match.assists, match.teamKills) * 100;
  const visionPerMin = match.visionScore / durationMinutes;
  const goldPerMin = match.goldPerMinute > 0 ? match.goldPerMinute : match.goldEarned / durationMinutes;
  const deathsPer10 = (match.deaths / durationMinutes) * 10;
  const timeDeadPct = safeDivide(match.timeSpentDead, match.gameDuration) * 100;
  const wardPoints = match.wardsPlaced + match.wardsKilled * 1.5 + match.controlWardsPlaced * 2;
  const wardScorePer10 = (wardPoints / durationMinutes) * 10;
  const objectiveActions = match.turretKills + match.inhibitorKills * 1.5 + match.dragonKills * 1.5 + match.objectivesStolen * 2.2 + (match.firstBloodKill || match.firstBloodAssist ? 0.4 : 0);
  const multiKillPoints = match.doubleKills + match.tripleKills * 2 + match.quadraKills * 4 + match.pentaKills * 7;
  const assistsPer10 = (match.assists / durationMinutes) * 10;
  const lanePressureRaw = role === "UTILITY"
    ? killParticipation * 0.12 + visionPerMin * 2.5 + (match.firstBloodKill || match.firstBloodAssist ? 5 : 0)
    : Math.max(match.maxCsAdvantage, 0) * 0.45 + match.soloKills * 5 + (match.firstBloodKill || match.firstBloodAssist ? 5 : 0) + Math.max(match.enemyMissedCS, 0) * 0.08;

  const combat = role === "UTILITY"
    ? ratioScore(kda, config.targets.kda) * 0.34 + ratioScore(killParticipation, config.targets.killParticipation) * 0.36 + ratioScore(damagePerMin, config.targets.damagePerMin) * 0.18 + ratioScore(assistsPer10, 4.5) * 0.12
    : ratioScore(kda, config.targets.kda) * 0.32 + ratioScore(damagePerMin, config.targets.damagePerMin) * 0.32 + ratioScore(damageShare, config.targets.damageShare) * 0.22 + ratioScore(match.soloKills + multiKillPoints * 0.35, 1.2) * 0.14;

  const economy = role === "UTILITY"
    ? ratioScore(goldPerMin, config.targets.goldPerMin) * 0.55 + ratioScore(assistsPer10, 4.5) * 0.45
    : ratioScore(csPerMin, config.targets.csPerMin) * 0.62 + ratioScore(goldPerMin, config.targets.goldPerMin) * 0.38;

  const teamplay = ratioScore(killParticipation, config.targets.killParticipation) * 0.68 + ratioScore(assistsPer10, role === "UTILITY" ? 5.2 : 3.2) * 0.32;
  const vision = ratioScore(visionPerMin, config.targets.visionPerMin) * 0.62 + ratioScore(wardScorePer10, config.targets.wardScorePer10) * 0.38;
  const survival = lowerIsBetterScore(deathsPer10, config.targets.deathsPer10) * 0.68 + lowerIsBetterScore(timeDeadPct, 13) * 0.32;
  const objectives = ratioScore(objectiveActions, config.targets.objectiveActions) * 0.74 + ratioScore(match.teamObjectivesStolen + match.teamTurretKills * 0.12, 1.1) * 0.26;
  const lane = ratioScore(lanePressureRaw, config.targets.lanePressure);

  const components: Record<ComponentKey, number> = {
    combat: clamp(combat, 0, 100),
    economy: clamp(economy, 0, 100),
    teamplay: clamp(teamplay, 0, 100),
    vision: clamp(vision, 0, 100),
    survival: clamp(survival, 0, 100),
    objectives: clamp(objectives, 0, 100),
    lane: clamp(lane, 0, 100),
  };

  const weightedComponents = (Object.keys(config.weights) as ComponentKey[]).reduce((sum, key) => sum + components[key] * config.weights[key], 0) / 100;
  const outcomeAdjustment = match.win ? 2.5 : -1.5;
  const afkAdjustment = match.hadAfkTeammate && !match.win ? 1.5 : 0;
  const performanceScore = clamp(weightedComponents + outcomeAdjustment + afkAdjustment, 0, 100);

  return {
    source: match,
    role,
    durationMinutes,
    kda,
    csPerMin,
    damagePerMin,
    damageShare,
    killParticipation,
    visionPerMin,
    goldPerMin,
    deathsPer10,
    timeDeadPct,
    wardScorePer10,
    objectiveActions,
    lanePressureRaw,
    components,
    performanceScore,
  };
}

function aggregateStats(matches: DerivedMatch[]): ProfileStats {
  const N = matches.length;
  const wins = matches.filter((match) => match.source.win).length;
  const recencyWeights = matches.map((_, index) => Math.exp(-index / 7));
  const componentScores = {} as Record<ComponentKey, number>;
  for (const key of Object.keys(COMPONENT_LABELS) as ComponentKey[]) {
    componentScores[key] = weightedMean(matches.map((match) => match.components[key]), recencyWeights);
  }
  const scores = matches.map((match) => match.performanceScore);
  const baselineScore = mean(scores);
  const recentFormScore = ewma(scores, 0.34);
  const consistencyScore = clamp(100 - stdDev(scores) * 2.35, 0, 100);
  const avgDeaths = mean(matches.map((match) => match.source.deaths));
  const deathSpikeThreshold = Math.max(7, avgDeaths + 2.5);

  return {
    games: N,
    wins,
    winRate: safeDivide(wins, N) * 100,
    avgKda: mean(matches.map((match) => match.kda)),
    avgKills: mean(matches.map((match) => match.source.kills)),
    avgDeaths,
    avgAssists: mean(matches.map((match) => match.source.assists)),
    avgCsPerMin: mean(matches.map((match) => match.csPerMin)),
    avgDamagePerMin: mean(matches.map((match) => match.damagePerMin)),
    avgDamageShare: mean(matches.map((match) => match.damageShare)),
    avgKillParticipation: mean(matches.map((match) => match.killParticipation)),
    avgVisionPerMin: mean(matches.map((match) => match.visionPerMin)),
    avgGoldPerMin: mean(matches.map((match) => match.goldPerMin)),
    avgTimeDeadPct: mean(matches.map((match) => match.timeDeadPct)),
    avgWardScorePer10: mean(matches.map((match) => match.wardScorePer10)),
    avgObjectiveActions: mean(matches.map((match) => match.objectiveActions)),
    avgLanePressure: mean(matches.map((match) => match.lanePressureRaw)),
    avgControlWards: mean(matches.map((match) => match.source.controlWardsPlaced)),
    avgSoloKills: mean(matches.map((match) => match.source.soloKills)),
    avgTurretKills: mean(matches.map((match) => match.source.turretKills)),
    avgDragonKills: mean(matches.map((match) => match.source.dragonKills)),
    avgObjectivesStolen: mean(matches.map((match) => match.source.objectivesStolen)),
    avgInhibitorKills: mean(matches.map((match) => match.source.inhibitorKills)),
    avgBountyGold: mean(matches.map((match) => match.source.bountyGold)),
    avgCsAdvantage: mean(matches.map((match) => match.source.maxCsAdvantage)),
    firstBloodRate: safeDivide(matches.filter((match) => match.source.firstBloodKill || match.source.firstBloodAssist).length, N) * 100,
    deathSpikeGames: matches.filter((match) => match.source.deaths >= deathSpikeThreshold).length,
    mostDeaths: Math.max(...matches.map((match) => match.source.deaths), 0),
    componentScores,
    consistencyScore,
    recentFormScore,
    baselineScore,
  };
}

function primaryRole(matches: DerivedMatch[]): { role: AnalysisRole; distribution: Record<string, number>; share: number } {
  const counts = new Map<AnalysisRole, number>();
  for (const match of matches) counts.set(match.role, (counts.get(match.role) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const role = sorted[0]?.[0] ?? "";
  const distribution: Record<string, number> = {};
  for (const [itemRole, count] of sorted) distribution[ROLE_CONFIGS[itemRole].label] = round1((count / matches.length) * 100);
  return { role, distribution, share: matches.length > 0 ? ((sorted[0]?.[1] ?? 0) / matches.length) * 100 : 0 };
}

function metricDescription(key: ComponentKey, stats: ProfileStats, role: AnalysisRole): string {
  switch (key) {
    case "combat": return `${Math.round(stats.avgDamagePerMin)} obrażeń/min, ${stats.avgDamageShare.toFixed(1)}% udziału w obrażeniach i KDA ${stats.avgKda.toFixed(2)}`;
    case "economy": return role === "UTILITY" ? `${Math.round(stats.avgGoldPerMin)} złota/min i ${stats.avgAssists.toFixed(1)} asysty/mecz — ekonomia oceniana jak dla supporta` : `${stats.avgCsPerMin.toFixed(1)} CS/min oraz ${Math.round(stats.avgGoldPerMin)} złota/min`;
    case "teamplay": return `${stats.avgKillParticipation.toFixed(1)}% KP i ${stats.avgAssists.toFixed(1)} asysty/mecz`;
    case "vision": return `${stats.avgVisionPerMin.toFixed(2)} wizji/min, ${stats.avgWardScorePer10.toFixed(1)} punktów wardów/10 min`;
    case "survival": return `${stats.avgDeaths.toFixed(1)} śmierci/mecz i ${stats.avgTimeDeadPct.toFixed(1)}% czasu poza grą`;
    case "objectives": return `${stats.avgObjectiveActions.toFixed(2)} akcji przy celach/mecz, ${stats.avgTurretKills.toFixed(1)} wieży i ${stats.avgDragonKills.toFixed(1)} smoka`;
    case "lane": return role === "UTILITY" ? `${stats.firstBloodRate.toFixed(0)}% udziału w first blood i presja oparta na KP/wizji` : `${stats.avgCsAdvantage.toFixed(1)} maks. przewagi CS, ${stats.avgSoloKills.toFixed(1)} solo killa i ${stats.firstBloodRate.toFixed(0)}% udziału w first blood`;
  }
}

function roleSpecificStrength(key: ComponentKey, stats: ProfileStats, role: AnalysisRole): string {
  const roleLabel = ROLE_CONFIGS[role].label;
  const prefix = `${COMPONENT_LABELS[key]} (${roleLabel})`;
  switch (`${role}:${key}`) {
    case "JUNGLE:objectives": return `${prefix}: szybko zamienia aktywność na smoki, wieże i kontrolę mapy; średnio ${stats.avgObjectiveActions.toFixed(2)} akcji przy celach na mecz.`;
    case "JUNGLE:teamplay": return `${prefix}: ${stats.avgKillParticipation.toFixed(0)}% KP wskazuje, że regularnie łączy linie i uczestniczy w kluczowych walkach.`;
    case "UTILITY:vision": return `${prefix}: ${stats.avgVisionPerMin.toFixed(2)} wizji/min i ${stats.avgControlWards.toFixed(1)} pinka/mecz tworzą drużynie przewagę informacyjną.`;
    case "UTILITY:teamplay": return `${prefix}: ${stats.avgKillParticipation.toFixed(0)}% KP i ${stats.avgAssists.toFixed(1)} asysty/mecz pokazują silną obecność przy carry.`;
    case "BOTTOM:survival": return `${prefix}: niska liczba śmierci przy wysokim DPS sugeruje dobre pozycjonowanie w walkach drużynowych.`;
    case "BOTTOM:economy": return `${prefix}: ${stats.avgCsPerMin.toFixed(1)} CS/min i ${Math.round(stats.avgGoldPerMin)} złota/min zapewniają terminowe power spike'i.`;
    case "MIDDLE:lane": return `${prefix}: przewaga na linii i udział w first blood tworzą przestrzeń do rotacji na obie strony mapy.`;
    case "MIDDLE:combat": return `${prefix}: ${Math.round(stats.avgDamagePerMin)} obrażeń/min i ${stats.avgDamageShare.toFixed(0)}% udziału w DMG dają realną presję carry.`;
    case "TOP:lane": return `${prefix}: przewaga CS i solo kille pozwalają kontrolować boczną aleję bez ciągłej pomocy junglera.`;
    case "TOP:survival": return `${prefix}: dobrze zarządza długą linią i ogranicza darmowe zgony podczas presji bocznej.`;
    default: return `${prefix}: ${metricDescription(key, stats, role)}.`;
  }
}

function roleSpecificWeakness(key: ComponentKey, stats: ProfileStats, role: AnalysisRole): string {
  const roleLabel = ROLE_CONFIGS[role].label;
  const prefix = `${COMPONENT_LABELS[key]} (${roleLabel})`;
  switch (`${role}:${key}`) {
    case "JUNGLE:objectives": return `${prefix}: aktywność nie jest wystarczająco często zamieniana na smoki, Herolda lub wieże; po udanym ganku brakuje kolejnego kroku.`;
    case "JUNGLE:vision": return `${prefix}: zbyt mało informacji wokół wejść do jungli i celów utrudnia bezpieczne rozpoczęcie obiektywów.`;
    case "UTILITY:vision": return `${prefix}: wizja jest poniżej wymagań roli; wardy powinny pojawiać się przed celem, a nie dopiero po rozpoczęciu walki.`;
    case "UTILITY:survival": return `${prefix}: częste zgony supporta oddają kontrolę mapy i utrudniają przygotowanie wizji przed kolejnym celem.`;
    case "BOTTOM:survival": return `${prefix}: ${stats.avgDeaths.toFixed(1)} śmierci/mecz ogranicza czas zadawania obrażeń; priorytetem jest pozycjonowanie przed wejściem w zasięg przeciwnika.`;
    case "BOTTOM:economy": return `${prefix}: ${stats.avgCsPerMin.toFixed(1)} CS/min opóźnia drugi i trzeci przedmiot, przez co okno siły ADC pojawia się za późno.`;
    case "MIDDLE:teamplay": return `${prefix}: po zepchnięciu fali zbyt rzadko przekłada przewagę linii na rzekę i boczne aleje.`;
    case "MIDDLE:survival": return `${prefix}: zgony w centrum mapy otwierają przeciwnikowi dostęp do obu stron rzeki i obiektów.`;
    case "TOP:teamplay": return `${prefix}: presja bocznej alei nie jest zsynchronizowana z drużyną; teleport lub zejście pojawia się za późno.`;
    case "TOP:economy": return `${prefix}: traci zbyt dużo farmy na długiej linii, przez co nie buduje przewagi potrzebnej do gry 1v1.`;
    default: return `${prefix}: ${metricDescription(key, stats, role)} — wynik poniżej celu dla tej roli.`;
  }
}

function buildArchetype(role: AnalysisRole, stats: ProfileStats): { name: string; description: string } {
  const s = stats.componentScores;
  if (role === "JUNGLE") {
    if (s.objectives >= 72 && s.vision >= 60) return { name: "Kontroler tempa i obiektów", description: "Buduje przewagę przez planowanie ścieżki, informację i szybkie przechodzenie z akcji na cele mapy." };
    if (s.teamplay >= 72 && s.lane >= 62) return { name: "Gankujący rozgrywający", description: "Największą wartość daje wtedy, gdy wcześnie łączy linie i tworzy przewagę liczebną." };
    if (s.economy >= 72 && s.combat >= 66) return { name: "Skalujący carry z jungli", description: "Priorytetyzuje tempo farmy i później przejmuje walki dzięki przewadze poziomów oraz przedmiotów." };
    return { name: "Elastyczny jungler", description: "Łączy farmę, ganki i cele, ale nie opiera całej gry na jednym dominującym wzorcu." };
  }
  if (role === "UTILITY") {
    if (s.vision >= 76 && s.objectives >= 62) return { name: "Kontroler mapy", description: "Wygrywa przez przygotowanie terenu, odcinanie informacji i bezpieczne ustawianie drużyny przed celami." };
    if (s.teamplay >= 75 && s.lane >= 60) return { name: "Roamingowy playmaker", description: "Często pojawia się tam, gdzie można stworzyć przewagę liczebną i rozpocząć akcję." };
    if (s.survival >= 72 && s.teamplay >= 66) return { name: "Protektor carry", description: "Stawia na ochronę kluczowego gracza, cierpliwe użycie narzędzi i stabilność walk drużynowych." };
    return { name: "Uniwersalny support", description: "Łączy wizję, ochronę i inicjację bez skrajnego przechylenia w jeden styl." };
  }
  if (role === "BOTTOM") {
    if (s.economy >= 76 && s.combat >= 72) return { name: "Hiperskalujący carry", description: "Buduje przewagę ekonomiczną, a następnie zamienia ją w stały DPS w środkowej i późnej fazie gry." };
    if (s.lane >= 72 && s.combat >= 68) return { name: "Agresywny lane carry", description: "Szukając przewagi od początku, chce przejąć kontrolę nad botem zanim rozpocznie się gra o cele." };
    if (s.survival >= 74 && s.teamplay >= 62) return { name: "Pozycyjny teamfight carry", description: "Najlepiej działa w uporządkowanych walkach, gdzie może długo zadawać obrażenia z bezpiecznej pozycji." };
    return { name: "Elastyczny strzelec", description: "Dostosowuje tempo gry do przebiegu linii i składu drużyny, bez jednej dominującej cechy." };
  }
  if (role === "MIDDLE") {
    if (s.lane >= 72 && s.teamplay >= 68) return { name: "Roamingowy playmaker", description: "Tworzy tempo przez presję środka, pierwszeństwo na rzece i szybkie rotacje do bocznych alei." };
    if (s.economy >= 74 && s.combat >= 72) return { name: "Skalujący kontroler", description: "Dba o farmę i pozycję, by w późniejszych walkach kontrolować przestrzeń oraz zadawać stałe obrażenia." };
    if (s.combat >= 78 && s.lane >= 62) return { name: "Burst carry", description: "Buduje wpływ przez przewagę mechaniczną, szybkie eliminacje i karanie błędnego ustawienia przeciwnika." };
    return { name: "Wszechstronny midlaner", description: "Łączy farmę, presję linii i udział w walkach bez jednego skrajnego priorytetu." };
  }
  if (role === "TOP") {
    if (s.lane >= 74 && s.economy >= 68) return { name: "Carry bocznej alei", description: "Buduje samodzielną przewagę i chce zmuszać przeciwnika do reagowania na presję side lane." };
    if (s.survival >= 72 && s.teamplay >= 64) return { name: "Stabilny weakside", description: "Dobrze absorbuje presję, ogranicza straty i pozostaje użyteczny w walkach mimo mniejszej liczby zasobów." };
    if (s.combat >= 72 && s.objectives >= 62) return { name: "Frontline konwertujący przewagę", description: "Po wygranej wymianie szuka wież, przestrzeni i wejścia w walkę dla drużyny." };
    return { name: "Elastyczny toplaner", description: "Potrafi grać zarówno przez linię, jak i przez walki drużynowe, ale bez wyraźnie dominującego wzorca." };
  }
  return { name: "Wszechstronny gracz", description: "Dane obejmują kilka ról, dlatego profil nie jest przypisany do jednego specjalistycznego archetypu." };
}

function championRecommendations(role: AnalysisRole, archetype: string) {
  const recommendations: Record<AnalysisRole, { championName: string; reason: string; playstyleMatch: string }[]> = {
    TOP: [
      { championName: "Jax", reason: "Łączy skalowanie, presję bocznej alei i możliwość przejęcia walki po przewadze ekonomicznej.", playstyleMatch: archetype },
      { championName: "Ornn", reason: "Daje stabilną linię, frontline i wysoką wartość dla drużyny nawet bez prowadzenia.", playstyleMatch: archetype },
      { championName: "Gwen", reason: "Nagradza dobrą farmę, pozycjonowanie i świadome wybieranie długich walk.", playstyleMatch: archetype },
    ],
    JUNGLE: [
      { championName: "Jarvan IV", reason: "Pozwala szybko zamieniać tempo ganków na inicjację i cele mapy.", playstyleMatch: archetype },
      { championName: "Vi", reason: "Ma czytelny plan gry, mocne wejście na carry i dobrą konwersję przewagi.", playstyleMatch: archetype },
      { championName: "Nocturne", reason: "Łączy stabilną farmę z globalną presją po zdobyciu szóstego poziomu.", playstyleMatch: archetype },
    ],
    MIDDLE: [
      { championName: "Orianna", reason: "Nagradza kontrolę fali, pozycjonowanie i wpływ na uporządkowane walki.", playstyleMatch: archetype },
      { championName: "Ahri", reason: "Daje bezpieczną linię, mobilność i możliwość tworzenia akcji na bocznych alejach.", playstyleMatch: archetype },
      { championName: "Viktor", reason: "Dobrze wykorzystuje przewagę ekonomiczną i stabilne skalowanie do teamfightów.", playstyleMatch: archetype },
    ],
    BOTTOM: [
      { championName: "Jinx", reason: "Mocno nagradza ekonomię, bezpieczne ustawienie i długie walki z resetami.", playstyleMatch: archetype },
      { championName: "Kai'Sa", reason: "Pozwala elastycznie przechodzić od skalowania do agresywnego domykania celu.", playstyleMatch: archetype },
      { championName: "Ashe", reason: "Daje wpływ przez wizję, inicjację i użyteczność nawet przy słabszej linii.", playstyleMatch: archetype },
    ],
    UTILITY: [
      { championName: "Nautilus", reason: "Ma prostą inicjację i łatwo zamienia przewagę informacji w wyłapanie celu.", playstyleMatch: archetype },
      { championName: "Lulu", reason: "Wzmacnia ochronę carry i premiuje cierpliwe zarządzanie kluczowymi umiejętnościami.", playstyleMatch: archetype },
      { championName: "Bard", reason: "Nagradza kontrolę mapy, roaming i świadome tworzenie przewagi liczebnej.", playstyleMatch: archetype },
    ],
    "": [
      { championName: "Garen", reason: "Prosta mechanika pozwala skupić się na decyzjach i makro.", playstyleMatch: archetype },
      { championName: "Annie", reason: "Czytelne okna siły ułatwiają analizę pozycji i wyboru celu.", playstyleMatch: archetype },
      { championName: "Ashe", reason: "Daje wartość przez informację i inicjację niezależnie od roli carry.", playstyleMatch: archetype },
    ],
  };
  return recommendations[role];
}

function roadmapForComponent(key: ComponentKey, score: number, stats: ProfileStats, role: AnalysisRole, priority: number) {
  const target = ROLE_CONFIGS[role].targets;
  const area = COMPONENT_LABELS[key];
  const tips: Record<ComponentKey, { current: string; target: string; tip: string }> = {
    combat: { current: `${Math.round(stats.avgDamagePerMin)} DMG/min, KDA ${stats.avgKda.toFixed(2)}`, target: `${Math.round(target.damagePerMin)}+ DMG/min przy KDA ${target.kda.toFixed(1)}+`, tip: "Przed walką określ swój najważniejszy cel i zachowaj kluczową umiejętność na moment, gdy przeciwnik zużyje mobilność lub kontrolę tłumu." },
    economy: role === "UTILITY"
      ? { current: `${Math.round(stats.avgGoldPerMin)} gold/min`, target: `${Math.round(target.goldPerMin)}+ gold/min bez zabierania farmy carry`, tip: "Łącz powroty do bazy z odświeżeniem wardów i szukaj asyst przy akcjach, zamiast przypadkowo zbierać fale przeznaczone dla carry." }
      : { current: `${stats.avgCsPerMin.toFixed(1)} CS/min`, target: `${target.csPerMin.toFixed(1)}+ CS/min`, tip: "Po każdej akcji sprawdź najbliższą bezpieczną falę. Nie czekaj bezczynnie na następną walkę, gdy możesz zebrać złoto bez utraty celu mapy." },
    teamplay: { current: `${stats.avgKillParticipation.toFixed(0)}% KP`, target: `${target.killParticipation.toFixed(0)}%+ KP`, tip: "Przed rozpoczęciem wymiany sprawdź pozycję drużyny i fal. Rotuj wtedy, gdy masz pierwszeństwo, zamiast reagować dopiero po rozpoczęciu walki." },
    vision: { current: `${stats.avgVisionPerMin.toFixed(2)} wizji/min`, target: `${target.visionPerMin.toFixed(2)}+ wizji/min`, tip: "Ustaw pierwszą warstwę wizji 75–90 sekund przed celem, wróć po uzupełnienie wardów i dopiero wtedy twórz głębszą kontrolę." },
    survival: { current: `${stats.avgDeaths.toFixed(1)} śmierci, ${stats.avgTimeDeadPct.toFixed(1)}% czasu martwy`, target: `≤ ${(target.deathsPer10 * 3).toFixed(1)} śmierci w 30 min`, tip: "Przed wejściem zadaj sobie dwa pytania: kto może Cię natychmiast ukarać i czy drużyna jest wystarczająco blisko, by kontynuować akcję." },
    objectives: { current: `${stats.avgObjectiveActions.toFixed(2)} akcji przy celach/mecz`, target: `${target.objectiveActions.toFixed(2)}+ akcji/mecz`, tip: "Po wygranej walce wybierz jeden konkretny zysk: wieża, smok, Herold/Baron albo głęboka wizja. Nie rozchodźcie się bez konwersji." },
    lane: { current: `${stats.avgCsAdvantage.toFixed(1)} przewagi CS, ${stats.firstBloodRate.toFixed(0)}% FB`, target: `${target.lanePressure.toFixed(0)} pkt presji`, tip: role === "UTILITY" ? "Wykorzystuj okna po wypchnięciu fali do wejścia w rzekę lub krótkiego roamu, ale wracaj zanim ADC straci bezpieczny dostęp do farmy." : "Zbuduj przewagę przez kontrolę fali: zamrożenie po przewadze, szybki push przed rotacją i reset dopiero po wprowadzeniu fali pod wieżę." },
  };
  const item = tips[key];
  return {
    priority,
    area,
    currentValue: item.current,
    targetValue: item.target,
    estimatedLpGain: Math.round(clamp((68 - score) * 0.45 + (5 - priority) * 2, 4, 24)),
    tip: item.tip,
  };
}

function emptyAnalysis() {
  return {
    overallScore: 0, overallRating: "Niewystarczające dane", totalGamesAnalyzed: 0, winRate: 0,
    metrics: [], championBreakdown: [],
    formTrend: { recentWinRate: 0, overallWinRate: 0, recentKda: 0, overallKda: 0, trend: "neutral", trendDescription: "Za mało danych", recentGames: 0 },
    strengths: [], weaknesses: [], playstyleArchetype: "Nieznany", playstyleDescription: "Za mało danych do zbudowania niezależnego profilu V2.",
    criticalMistakes: [], gameplayPatterns: [], primaryRole: "Nieznana", roleDistribution: {}, currentStreak: { type: "loss", count: 0 }, bestGame: null, worstGame: null,
    coachingTips: [], championRecommendations: [],
    performanceByGameLength: {
      short: { label: "< 25 min", gamesPlayed: 0, winRate: 0, avgKda: 0, avgCsPerMin: 0 },
      medium: { label: "25-35 min", gamesPlayed: 0, winRate: 0, avgKda: 0, avgCsPerMin: 0 },
      long: { label: "> 35 min", gamesPlayed: 0, winRate: 0, avgKda: 0, avgCsPerMin: 0 },
    },
    damageTypeBreakdown: { physicalPct: 0, magicPct: 0, truePct: 0 },
    predictedTier: { tier: "UNRANKED", division: "", lp: 0, confidence: "Niska", description: "Za mało danych do estymacji." },
    playstyleRadar: { aggression: 0, farming: 0, vision: 0, teamfighting: 0, carry: 0 },
    lanePhaseStats: { firstBloodRate: 0, avgEarlyKills: 0, avgCsAdvantage: 0, earlyPressureScore: 0, grade: "F", description: "Za mało danych." },
    objectiveStats: { avgTurretKills: 0, avgDragonKills: 0, avgObjectivesStolen: 0, avgInhibitorKills: 0, objectiveControlScore: 0, grade: "F", description: "Za mało danych." },
    deathAnalysis: { avgDeaths: 0, avgTimeDeadPct: 0, deathSpikeGames: 0, deathSpikeRate: 0, mostDeathsInGame: 0, avgBountyGold: 0, deathScore: 0, grade: "F", description: "Za mało danych." },
    tiltIndicator: { score: 0, description: "Za mało danych.", lossStreakKdaDrop: 0, isTilted: false },
    winConditions: { factors: [], summary: "Za mało danych do wykrycia warunków zwycięstwa." },
    powerCurve: { phases: [], strongestPhase: "unknown", description: "Za mało danych do oceny krzywej mocy." },
    rankBenchmarks: [], improvementRoadmap: [],
    comebackAnalysis: { comebackWinRate: 0, snowballWinRate: 0, evenWinRate: 0, comebackGames: 0, snowballGames: 0, evenGames: 0, description: "Za mało danych." },
    skillshotStats: { avgLanded: 0, avgDodged: 0, hitRate: 0, grade: "F", description: "Za mało danych." },
    matchTimeline: [],
    algorithmVersion: "2.1-independent",
    scoreConfidence: { value: 0, label: "Niska" },
    scoreBreakdown: {},
    roleInsights: [],
  };
}

function tierEstimate(score: number, confidenceLabel: string) {
  const tiers = [
    { min: 88, tier: "MASTER", division: "" },
    { min: 80, tier: "DIAMOND", division: "II" },
    { min: 72, tier: "EMERALD", division: "II" },
    { min: 64, tier: "PLATINUM", division: "II" },
    { min: 55, tier: "GOLD", division: "II" },
    { min: 46, tier: "SILVER", division: "II" },
    { min: 36, tier: "BRONZE", division: "II" },
    { min: 0, tier: "IRON", division: "II" },
  ];
  const selected = tiers.find((item) => score >= item.min) ?? tiers[tiers.length - 1];
  const next = tiers[tiers.indexOf(selected) - 1];
  const span = next ? next.min - selected.min : 12;
  const lp = Math.round(clamp(((score - selected.min) / Math.max(span, 1)) * 100, 0, 99));
  return {
    tier: selected.tier,
    division: selected.division,
    lp,
    confidence: confidenceLabel,
    description: `Estymacja V2 na podstawie jakości decyzji i wykonania w ostatnich meczach, a nie ukrytego MMR. Pewność: ${confidenceLabel.toLowerCase()}.`,
  };
}

export function computeIndependentAnalysisV2(rawMatches: MatchDataV2[]) {
  const valid = rawMatches.filter((match) => !match.wasAfk && match.gameDuration > 300 && match.gameMode !== "CHERRY");
  if (valid.length === 0) return emptyAnalysis();

  const matches = valid.map(deriveMatch);
  const stats = aggregateStats(matches);
  const roleInfo = primaryRole(matches);
  const role = roleInfo.role;
  const roleConfig = ROLE_CONFIGS[role];
  const reliability = stats.games / (stats.games + 8);
  const shrunkWinRate = shrinkWinRate(stats.wins, stats.games, 0.5, 10) * 100;
  const rawPerformance = weightedMean(matches.map((match) => match.performanceScore), matches.map((_, index) => Math.exp(-index / 7)));
  const stabilizedPerformance = 55 + (rawPerformance - 55) * reliability;
  const overallScore = Math.round(clamp(stabilizedPerformance * 0.77 + shrunkWinRate * 0.08 + stats.consistencyScore * 0.09 + roleInfo.share * 0.06, 0, 100));
  const overallRating = gradeFromScore(overallScore);

  const confidenceValue = Math.round(clamp((stats.games / 20) * 65 + roleInfo.share * 0.25 + Math.min(stats.games, 10) * 1.0, 0, 100));
  const confidenceLabel = confidenceValue >= 78 ? "Wysoka" : confidenceValue >= 52 ? "Średnia" : "Niska";

  const metrics = (Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((key) => ({
    name: COMPONENT_LABELS[key],
    value: Math.round(stats.componentScores[key]),
    maxValue: 100,
    rating: ratingFromScore(stats.componentScores[key]),
    description: metricDescription(key, stats, role),
  }));
  metrics.push({
    name: "Konsekwencja wykonania",
    value: Math.round(stats.consistencyScore),
    maxValue: 100,
    rating: ratingFromScore(stats.consistencyScore),
    description: `Odchylenie wyników meczowych ${stdDev(matches.map((match) => match.performanceScore)).toFixed(1)} pkt; im niższe, tym bardziej powtarzalna gra.`,
  });
  metrics.push({
    name: "Aktualna forma",
    value: Math.round(stats.recentFormScore),
    maxValue: 100,
    rating: ratingFromScore(stats.recentFormScore),
    description: `EWMA ostatnich meczów ${stats.recentFormScore.toFixed(1)} vs średnia profilu ${stats.baselineScore.toFixed(1)}.`,
  });

  const rankedComponents = (Object.keys(COMPONENT_LABELS) as ComponentKey[]).sort((a, b) => stats.componentScores[b] - stats.componentScores[a]);
  const strengths = rankedComponents.filter((key) => stats.componentScores[key] >= 66).slice(0, 4).map((key) => roleSpecificStrength(key, stats, role));
  if (strengths.length === 0) strengths.push(`Największym atutem jest ${COMPONENT_LABELS[rankedComponents[0]].toLowerCase()}, choć wynik nie osiąga jeszcze poziomu wyraźnej przewagi dla roli ${roleConfig.label}.`);
  const weaknesses = [...rankedComponents].reverse().filter((key) => stats.componentScores[key] < 58).slice(0, 4).map((key) => roleSpecificWeakness(key, stats, role));
  if (weaknesses.length === 0) weaknesses.push("Brak jednego krytycznego deficytu — największy potencjał poprawy leży w lepszej konwersji małych przewag na cele mapy.");

  const archetype = buildArchetype(role, stats);
  const currentStreakType = matches[0].source.win ? "win" : "loss";
  let currentStreakCount = 0;
  for (const match of matches) {
    if ((match.source.win ? "win" : "loss") !== currentStreakType) break;
    currentStreakCount += 1;
  }

  const recentCount = Math.min(5, matches.length);
  const recent = matches.slice(0, recentCount);
  const older = matches.slice(recentCount);
  const recentWinRate = safeDivide(recent.filter((match) => match.source.win).length, recent.length) * 100;
  const recentKda = mean(recent.map((match) => match.kda));
  const olderScore = older.length > 0 ? mean(older.map((match) => match.performanceScore)) : stats.baselineScore;
  const recentScore = mean(recent.map((match) => match.performanceScore));
  const scoreDelta = recentScore - olderScore;
  let trend = "stable";
  if (scoreDelta >= 8) trend = "hot";
  else if (scoreDelta >= 3) trend = "improving";
  else if (scoreDelta <= -8) trend = "cold";
  else if (scoreDelta <= -3) trend = "declining";
  const trendDescriptions: Record<string, string> = {
    hot: `Forma wyraźnie rośnie: ostatnie ${recentCount} gier jest średnio o ${scoreDelta.toFixed(1)} pkt lepsze od wcześniejszego poziomu.`,
    improving: `Lekka poprawa wykonania: ostatnie mecze są o ${scoreDelta.toFixed(1)} pkt powyżej wcześniejszej bazy.`,
    cold: `Wyraźny spadek formy: ostatnie ${recentCount} gier jest o ${Math.abs(scoreDelta).toFixed(1)} pkt słabsze; warto przerwać serię i przejrzeć zgony.`,
    declining: `Forma lekko spada: wynik ostatnich gier jest o ${Math.abs(scoreDelta).toFixed(1)} pkt niższy niż wcześniejszy poziom.`,
    stable: `Forma stabilna: różnica między ostatnimi grami a wcześniejszą bazą wynosi tylko ${scoreDelta.toFixed(1)} pkt.`,
  };

  const championMap = new Map<string, DerivedMatch[]>();
  for (const match of matches) {
    const list = championMap.get(match.source.championName) ?? [];
    list.push(match);
    championMap.set(match.source.championName, list);
  }
  const championBreakdown = [...championMap.entries()].map(([championName, championMatches]) => {
    const games = championMatches.length;
    const wins = championMatches.filter((match) => match.source.win).length;
    const sampleWeight = games / (games + 4);
    const rawChampionScore = mean(championMatches.map((match) => match.performanceScore));
    const performanceScore = Math.round(overallScore + (rawChampionScore - overallScore) * sampleWeight);
    return {
      championName,
      gamesPlayed: games,
      wins,
      losses: games - wins,
      winRate: round1(safeDivide(wins, games) * 100),
      avgKills: round1(mean(championMatches.map((match) => match.source.kills))),
      avgDeaths: round1(mean(championMatches.map((match) => match.source.deaths))),
      avgAssists: round1(mean(championMatches.map((match) => match.source.assists))),
      avgCs: Math.round(mean(championMatches.map((match) => match.source.cs))),
      avgCsPerMin: round1(mean(championMatches.map((match) => match.csPerMin))),
      avgDamage: Math.round(mean(championMatches.map((match) => match.source.totalDamageDealt))),
      avgGold: Math.round(mean(championMatches.map((match) => match.source.goldEarned))),
      avgVisionScore: round1(mean(championMatches.map((match) => match.source.visionScore))),
      kda: round2(mean(championMatches.map((match) => match.kda))),
      killParticipation: round1(mean(championMatches.map((match) => match.killParticipation))),
      damageShare: round1(mean(championMatches.map((match) => match.damageShare))),
      performanceScore,
      adjustedWinRate: round1(shrinkWinRate(wins, games, stats.winRate / 100, 8) * 100),
      winRateLowerBound: round1(wilsonLowerBound(wins, games) * 100),
    };
  }).sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.performanceScore - a.performanceScore);

  const timeline = matches.map((match, index) => ({
    matchIndex: index + 1,
    matchId: match.source.matchId,
    championName: match.source.championName,
    win: match.source.win,
    kills: match.source.kills,
    deaths: match.source.deaths,
    assists: match.source.assists,
    kda: round2(match.kda),
    performanceScore: Math.round(match.performanceScore),
    csPerMin: round1(match.csPerMin),
    gameDuration: match.source.gameDuration,
    gameEndTimestamp: match.source.gameEndTimestamp,
  }));
  const byScore = [...matches].sort((a, b) => b.performanceScore - a.performanceScore);
  const highlight = (match: DerivedMatch | undefined) => match ? {
    matchId: match.source.matchId,
    championName: match.source.championName,
    kills: match.source.kills,
    deaths: match.source.deaths,
    assists: match.source.assists,
    kda: round2(match.kda),
    totalDamageDealt: match.source.totalDamageDealt,
    win: match.source.win,
    gameDuration: match.source.gameDuration,
    performanceScore: Math.round(match.performanceScore),
    gameEndTimestamp: match.source.gameEndTimestamp,
  } : null;

  const lengthGroup = (predicate: (match: DerivedMatch) => boolean, label: string) => {
    const group = matches.filter(predicate);
    return {
      label,
      gamesPlayed: group.length,
      winRate: round1(safeDivide(group.filter((match) => match.source.win).length, group.length) * 100),
      avgKda: round2(mean(group.map((match) => match.kda))),
      avgCsPerMin: round1(mean(group.map((match) => match.csPerMin))),
    };
  };
  const performanceByGameLength = {
    short: lengthGroup((match) => match.durationMinutes < 25, "< 25 min"),
    medium: lengthGroup((match) => match.durationMinutes >= 25 && match.durationMinutes <= 35, "25-35 min"),
    long: lengthGroup((match) => match.durationMinutes > 35, "> 35 min"),
  };

  const totalPhysical = matches.reduce((sum, match) => sum + match.source.physicalDamage, 0);
  const totalMagic = matches.reduce((sum, match) => sum + match.source.magicDamage, 0);
  const totalTrue = matches.reduce((sum, match) => sum + match.source.trueDamage, 0);
  const totalTypedDamage = totalPhysical + totalMagic + totalTrue;

  const lowestComponents = [...rankedComponents].reverse().slice(0, 4);
  const improvementRoadmap = lowestComponents.map((key, index) => roadmapForComponent(key, stats.componentScores[key], stats, role, index + 1));
  const coachingTips = improvementRoadmap.map((item) => `${item.priority}. ${item.area}: ${item.tip}`);

  const criticalMistakes: string[] = [];
  if (stats.deathSpikeGames > 0) criticalMistakes.push(`${stats.deathSpikeGames}/${stats.games} meczów miało skok liczby śmierci. Najczęściej oznacza to dalsze wymuszanie akcji po utracie tempa.`);
  if (stats.componentScores.objectives < 48) criticalMistakes.push("Udane akcje zbyt rzadko kończą się trwałym zyskiem na mapie. Po przewadze drużyna powinna natychmiast wskazać jeden cel do konwersji.");
  if (stats.componentScores.survival < 48) criticalMistakes.push(`Średnio ${stats.avgTimeDeadPct.toFixed(1)}% czasu gry jest tracone przez śmierci; to ogranicza farmę, wizję i obecność przy kolejnych celach.`);
  if (stats.componentScores.teamplay < 48) criticalMistakes.push(`KP ${stats.avgKillParticipation.toFixed(0)}% jest niskie względem roli ${roleConfig.label}; część walk rozpoczyna się bez odpowiedniego przygotowania pozycji.`);
  if (stats.componentScores.economy < 48) criticalMistakes.push(role === "UTILITY" ? "Tempo ekonomii supporta spada przez zbyt małą liczbę bezpiecznych asyst i nieefektywne powroty do bazy." : "Zbyt dużo fal przepada między akcjami, przez co przewaga mechaniczna nie zamienia się w terminowe przedmioty.");
  if (criticalMistakes.length === 0) criticalMistakes.push("Brak jednego powtarzalnego błędu krytycznego; największa rezerwa leży w szybszym wyborze celu po wygranej akcji.");

  const wins = matches.filter((match) => match.source.win);
  const losses = matches.filter((match) => !match.source.win);
  const gameplayPatterns: string[] = [];
  const winLossKdaDelta = mean(wins.map((match) => match.kda)) - mean(losses.map((match) => match.kda));
  const winLossDeathDelta = mean(losses.map((match) => match.source.deaths)) - mean(wins.map((match) => match.source.deaths));
  const winLossObjectiveDelta = mean(wins.map((match) => match.objectiveActions)) - mean(losses.map((match) => match.objectiveActions));
  gameplayPatterns.push(`W zwycięstwach KDA rośnie o ${winLossKdaDelta.toFixed(2)}, a liczba śmierci spada o ${winLossDeathDelta.toFixed(1)} — wynik jest silnie związany z kontrolą ryzyka.`);
  gameplayPatterns.push(`Różnica konwersji celów między wygranymi i przegranymi wynosi ${winLossObjectiveDelta.toFixed(2)} akcji na mecz.`);
  if (stats.componentScores.lane > stats.componentScores.objectives + 14) gameplayPatterns.push("Profil często wygrywa pierwszą część gry, ale nie zachowuje tej samej jakości przy zamianie przewagi na wieże i neutralne cele.");
  if (stats.componentScores.economy > stats.componentScores.teamplay + 14) gameplayPatterns.push("Dużo zasobów jest zbieranych samodzielnie, lecz udział w walkach nie rośnie w tym samym tempie — potrzebna jest lepsza synchronizacja fal z drużyną.");
  if (stats.componentScores.teamplay > stats.componentScores.economy + 14 && role !== "UTILITY") gameplayPatterns.push("Częsta obecność w akcjach odbywa się kosztem farmy; część rotacji jest podejmowana bez wystarczającej wartości celu.");

  const factorDefinitions = [
    { factor: "KDA", win: mean(wins.map((match) => match.kda)), loss: mean(losses.map((match) => match.kda)), higherBetter: true },
    { factor: "Śmierci", win: mean(wins.map((match) => match.source.deaths)), loss: mean(losses.map((match) => match.source.deaths)), higherBetter: false },
    { factor: role === "UTILITY" ? "Wizja/min" : "CS/min", win: mean(wins.map((match) => role === "UTILITY" ? match.visionPerMin : match.csPerMin)), loss: mean(losses.map((match) => role === "UTILITY" ? match.visionPerMin : match.csPerMin)), higherBetter: true },
    { factor: "KP%", win: mean(wins.map((match) => match.killParticipation)), loss: mean(losses.map((match) => match.killParticipation)), higherBetter: true },
    { factor: "Akcje przy celach", win: mean(wins.map((match) => match.objectiveActions)), loss: mean(losses.map((match) => match.objectiveActions)), higherBetter: true },
  ];
  const winConditionFactors = factorDefinitions.map((factor) => {
    const denominator = Math.max(Math.abs(factor.win), Math.abs(factor.loss), 1);
    const signedDifference = factor.higherBetter ? factor.win - factor.loss : factor.loss - factor.win;
    const impact = clamp((signedDifference / denominator) * 100, -100, 100);
    return {
      factor: factor.factor,
      winAvg: round2(factor.win),
      lossAvg: round2(factor.loss),
      impact: Math.round(impact),
      description: impact > 0 ? "Lepszy wynik tej statystyki wyraźnie częściej pojawia się w zwycięstwach." : "Ta statystyka nie odróżnia obecnie zwycięstw od porażek lub działa odwrotnie niż oczekiwano.",
    };
  }).sort((a, b) => b.impact - a.impact);

  const phaseDefinitions = [
    { phase: "early", label: "Krótka gra", filter: (match: DerivedMatch) => match.durationMinutes < 25 },
    { phase: "mid", label: "Środkowa długość", filter: (match: DerivedMatch) => match.durationMinutes >= 25 && match.durationMinutes <= 35 },
    { phase: "late", label: "Długa gra", filter: (match: DerivedMatch) => match.durationMinutes > 35 },
  ];
  const phases = phaseDefinitions.map((definition) => {
    const group = matches.filter(definition.filter);
    return {
      phase: definition.phase,
      label: definition.label,
      winRate: round1(safeDivide(group.filter((match) => match.source.win).length, group.length) * 100),
      avgKda: round2(mean(group.map((match) => match.kda))),
      avgPerformance: round1(mean(group.map((match) => match.performanceScore))),
      gamesPlayed: group.length,
    };
  });
  const strongestPhase = [...phases].filter((phase) => phase.gamesPlayed > 0).sort((a, b) => b.avgPerformance - a.avgPerformance)[0]?.phase ?? "unknown";

  const snowballMatches = matches.filter((match) => match.source.firstBloodKill || match.source.firstBloodAssist || match.source.soloKills >= 2 || match.source.maxCsAdvantage >= 15);
  const comebackMatches = matches.filter((match) => match.source.maxCsAdvantage < 0 || (!match.source.firstBloodKill && !match.source.firstBloodAssist && match.source.deaths >= 3 && match.durationMinutes > 28));
  const classifiedIds = new Set([...snowballMatches, ...comebackMatches].map((match) => match.source.matchId));
  const evenMatches = matches.filter((match) => !classifiedIds.has(match.source.matchId));
  const groupWinRate = (group: DerivedMatch[]) => round1(safeDivide(group.filter((match) => match.source.win).length, group.length) * 100);

  const skillshotsLanded = mean(matches.map((match) => match.source.skillshotsLanded));
  const skillshotsDodged = mean(matches.map((match) => match.source.skillshotsDodged));
  const skillshotTotal = matches.reduce((sum, match) => sum + match.source.skillshotsLanded + match.source.skillshotsDodged, 0);
  const skillshotHitRate = skillshotTotal > 0 ? matches.reduce((sum, match) => sum + match.source.skillshotsLanded, 0) / skillshotTotal * 100 : 0;
  const skillshotScore = ratioScore(skillshotHitRate, 58);

  const recentThree = matches.slice(0, Math.min(3, matches.length));
  const recentThreeScore = mean(recentThree.map((match) => match.performanceScore));
  const recentThreeKda = mean(recentThree.map((match) => match.kda));
  const kdaDrop = Math.max(0, stats.avgKda - recentThreeKda);
  const tiltScore = clamp((stats.baselineScore - recentThreeScore) * 4 + (currentStreakType === "loss" ? currentStreakCount * 9 : 0) + stats.deathSpikeGames * 3, 0, 100);
  const isTilted = tiltScore >= 58 && currentStreakType === "loss";

  const rankBenchmarks = [
    { stat: "KDA", playerValue: round2(stats.avgKda), tierAvg: roleConfig.targets.kda, unit: "", higherBetter: true },
    { stat: role === "UTILITY" ? "Wizja/min" : "CS/min", playerValue: round2(role === "UTILITY" ? stats.avgVisionPerMin : stats.avgCsPerMin), tierAvg: role === "UTILITY" ? roleConfig.targets.visionPerMin : roleConfig.targets.csPerMin, unit: "/min", higherBetter: true },
    { stat: "Obrażenia/min", playerValue: Math.round(stats.avgDamagePerMin), tierAvg: roleConfig.targets.damagePerMin, unit: "/min", higherBetter: true },
    { stat: "KP", playerValue: round1(stats.avgKillParticipation), tierAvg: roleConfig.targets.killParticipation, unit: "%", higherBetter: true },
    { stat: "Śmierci/10 min", playerValue: round2(mean(matches.map((match) => match.deathsPer10))), tierAvg: roleConfig.targets.deathsPer10, unit: "/10 min", higherBetter: false },
    { stat: "Akcje przy celach", playerValue: round2(stats.avgObjectiveActions), tierAvg: roleConfig.targets.objectiveActions, unit: "/mecz", higherBetter: true },
  ].map((benchmark) => ({ ...benchmark, pctDiff: round1(safeDivide(benchmark.playerValue - benchmark.tierAvg, benchmark.tierAvg) * 100) }));

  const roleInsights = rankedComponents.slice(0, 3).map((key) => ({
    area: COMPONENT_LABELS[key],
    score: Math.round(stats.componentScores[key]),
    interpretation: roleSpecificStrength(key, stats, role),
  }));

  return {
    overallScore,
    overallRating,
    totalGamesAnalyzed: stats.games,
    winRate: round1(stats.winRate),
    metrics,
    championBreakdown,
    formTrend: {
      recentWinRate: round1(recentWinRate),
      overallWinRate: round1(stats.winRate),
      recentKda: round2(recentKda),
      overallKda: round2(stats.avgKda),
      trend,
      trendDescription: trendDescriptions[trend],
      recentGames: recentCount,
    },
    strengths,
    weaknesses,
    playstyleArchetype: archetype.name,
    playstyleDescription: archetype.description,
    criticalMistakes,
    gameplayPatterns,
    primaryRole: roleConfig.label,
    roleDistribution: roleInfo.distribution,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    bestGame: highlight(byScore[0]),
    worstGame: highlight(byScore[byScore.length - 1]),
    coachingTips,
    championRecommendations: championRecommendations(role, archetype.name),
    performanceByGameLength,
    damageTypeBreakdown: {
      physicalPct: round1(safeDivide(totalPhysical, totalTypedDamage) * 100),
      magicPct: round1(safeDivide(totalMagic, totalTypedDamage) * 100),
      truePct: round1(safeDivide(totalTrue, totalTypedDamage) * 100),
    },
    predictedTier: tierEstimate(overallScore, confidenceLabel),
    playstyleRadar: {
      aggression: Math.round((stats.componentScores.combat + stats.componentScores.lane) / 2),
      farming: Math.round(stats.componentScores.economy),
      vision: Math.round(stats.componentScores.vision),
      teamfighting: Math.round((stats.componentScores.teamplay + stats.componentScores.combat) / 2),
      carry: Math.round((stats.componentScores.combat + stats.componentScores.economy + stats.componentScores.survival) / 3),
    },
    lanePhaseStats: {
      firstBloodRate: round1(stats.firstBloodRate),
      avgEarlyKills: round1(stats.avgKills),
      avgCsAdvantage: round1(stats.avgCsAdvantage),
      earlyPressureScore: Math.round(stats.componentScores.lane),
      grade: gradeFromScore(stats.componentScores.lane),
      description: role === "UTILITY" ? `Presja linii supporta jest liczona z udziału w first blood, KP i wczesnej wizji. Wynik: ${stats.componentScores.lane.toFixed(1)}.` : `Proxy presji linii: ${stats.avgCsAdvantage.toFixed(1)} maks. przewagi CS, ${stats.avgSoloKills.toFixed(1)} solo killa i ${stats.firstBloodRate.toFixed(0)}% udziału w first blood.`,
    },
    objectiveStats: {
      avgTurretKills: round1(stats.avgTurretKills),
      avgDragonKills: round1(stats.avgDragonKills),
      avgObjectivesStolen: round2(stats.avgObjectivesStolen),
      avgInhibitorKills: round1(stats.avgInhibitorKills),
      objectiveControlScore: Math.round(stats.componentScores.objectives),
      grade: gradeFromScore(stats.componentScores.objectives),
      description: `V2 ocenia nie tylko liczbę celów, ale też to, czy akcje są zamieniane na trwały zysk. Średnio ${stats.avgObjectiveActions.toFixed(2)} akcji przy celach/mecz.`,
    },
    deathAnalysis: {
      avgDeaths: round1(stats.avgDeaths),
      avgTimeDeadPct: round1(stats.avgTimeDeadPct),
      deathSpikeGames: stats.deathSpikeGames,
      deathSpikeRate: round1(safeDivide(stats.deathSpikeGames, stats.games) * 100),
      mostDeathsInGame: stats.mostDeaths,
      avgBountyGold: Math.round(stats.avgBountyGold),
      deathScore: Math.round(stats.componentScores.survival),
      grade: gradeFromScore(stats.componentScores.survival),
      description: `${stats.deathSpikeGames} meczów przekroczyło indywidualny próg skoku śmierci; średnio ${stats.avgTimeDeadPct.toFixed(1)}% gry spędzone poza mapą.`,
    },
    tiltIndicator: {
      score: Math.round(tiltScore),
      description: isTilted ? `Wykryto połączenie serii ${currentStreakCount} porażek i spadku jakości ostatnich gier. Zalecana przerwa przed kolejnym rankedem.` : `Brak mocnego sygnału tiltu. Różnica ostatnich trzech gier względem bazy: ${(recentThreeScore - stats.baselineScore).toFixed(1)} pkt.`,
      lossStreakKdaDrop: round2(kdaDrop),
      isTilted,
    },
    winConditions: {
      factors: winConditionFactors,
      summary: winConditionFactors[0] ? `Najsilniejszy wykryty warunek zwycięstwa: ${winConditionFactors[0].factor}. Wpływ jest liczony z różnicy między wygranymi i przegranymi, a nie z samego progu statystyki.` : "Brak wystarczającej liczby wygranych i przegranych do porównania.",
    },
    powerCurve: {
      phases,
      strongestPhase,
      description: strongestPhase === "unknown" ? "Za mało danych w grupach długości meczu." : `Najwyższy średni wynik wykonania pojawia się w fazie: ${phases.find((phase) => phase.phase === strongestPhase)?.label ?? strongestPhase}.`,
    },
    rankBenchmarks,
    improvementRoadmap,
    comebackAnalysis: {
      comebackWinRate: groupWinRate(comebackMatches),
      snowballWinRate: groupWinRate(snowballMatches),
      evenWinRate: groupWinRate(evenMatches),
      comebackGames: comebackMatches.length,
      snowballGames: snowballMatches.length,
      evenGames: evenMatches.length,
      description: "Klasyfikacja używa proxy wczesnej przewagi: first blood, solo kille i przewaga CS. Nie jest to bezpośredni odczyt różnicy złota w 15. minucie.",
    },
    skillshotStats: {
      avgLanded: round1(skillshotsLanded),
      avgDodged: round1(skillshotsDodged),
      hitRate: round1(skillshotHitRate),
      grade: skillshotTotal > 0 ? gradeFromScore(skillshotScore) : "N/D",
      description: skillshotTotal > 0 ? `Na podstawie danych challenges: ${skillshotHitRate.toFixed(1)}% relacji trafień do trafień + uników.` : "Riot nie zwrócił wystarczających danych challenges dla tej próbki.",
    },
    matchTimeline: timeline,
    algorithmVersion: "2.1-independent",
    scoreConfidence: { value: confidenceValue, label: confidenceLabel },
    scoreBreakdown: {
      role: roleConfig.label,
      rawPerformance: round1(rawPerformance),
      stabilizedPerformance: round1(stabilizedPerformance),
      recentFormScore: round1(stats.recentFormScore),
      consistencyScore: round1(stats.consistencyScore),
      shrunkWinRate: round1(shrunkWinRate),
      roleStability: round1(roleInfo.share),
      sampleReliability: round1(reliability * 100),
      components: Object.fromEntries((Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((key) => [key, round1(stats.componentScores[key])])),
    },
    roleInsights,
  };
}
