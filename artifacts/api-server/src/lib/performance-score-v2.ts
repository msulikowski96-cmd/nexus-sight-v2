export type SupportedRole = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";

type MetricKey =
  | "kda"
  | "killParticipation"
  | "farm"
  | "damage"
  | "damageShare"
  | "multikills"
  | "vision"
  | "goldEfficiency"
  | "survival"
  | "consistency"
  | "carry"
  | "objectives";

interface MetricLike {
  name?: string;
  value?: number;
}

interface TimelineLike {
  matchId?: string;
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  kda?: number;
  performanceScore?: number;
  csPerMin?: number;
  gameDuration?: number;
}

interface AnalysisLike {
  overallScore?: number;
  overallRating?: string;
  totalGamesAnalyzed?: number;
  winRate?: number;
  metrics?: MetricLike[];
  primaryRole?: string;
  roleDistribution?: Record<string, number>;
  championBreakdown?: Array<Record<string, unknown> & { gamesPlayed?: number; performanceScore?: number }>;
  matchTimeline?: Array<Record<string, unknown> & TimelineLike>;
  bestGame?: (Record<string, unknown> & { matchId?: string; performanceScore?: number }) | null;
  worstGame?: (Record<string, unknown> & { matchId?: string; performanceScore?: number }) | null;
  [key: string]: unknown;
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;

const ROLE_ALIASES: Record<string, SupportedRole> = {
  TOP: "TOP",
  Top: "TOP",
  JUNGLE: "JUNGLE",
  Jungle: "JUNGLE",
  Jungler: "JUNGLE",
  MIDDLE: "MIDDLE",
  Mid: "MIDDLE",
  BOTTOM: "BOTTOM",
  ADC: "BOTTOM",
  UTILITY: "UTILITY",
  Support: "UTILITY",
  Nieznana: "",
  Unknown: "",
};

const METRIC_NAMES: Record<MetricKey, string[]> = {
  kda: ["KDA"],
  killParticipation: ["Uczestnictwo w zabójstwach", "Kill Participation"],
  farm: ["Efektywność CS", "Farma"],
  damage: ["Obrażenia"],
  damageShare: ["Udział w obrażeniach drużyny"],
  multikills: ["Multikille"],
  vision: ["Kontrola wizji", "Wizja"],
  goldEfficiency: ["Efektywność złota"],
  survival: ["Przeżywalność"],
  consistency: ["Konsekwencja"],
  carry: ["Potencjał carry"],
  objectives: ["Kontrola obiektywów"],
};

const ROLE_WEIGHTS: Record<SupportedRole, Record<MetricKey, number>> = {
  TOP: {
    kda: 14, killParticipation: 10, farm: 17, damage: 15,
    damageShare: 12, multikills: 2, vision: 5, goldEfficiency: 8,
    survival: 10, consistency: 4, carry: 1, objectives: 2,
  },
  JUNGLE: {
    kda: 10, killParticipation: 18, farm: 7, damage: 8,
    damageShare: 6, multikills: 1, vision: 12, goldEfficiency: 6,
    survival: 8, consistency: 6, carry: 4, objectives: 14,
  },
  MIDDLE: {
    kda: 15, killParticipation: 12, farm: 15, damage: 18,
    damageShare: 14, multikills: 3, vision: 4, goldEfficiency: 8,
    survival: 7, consistency: 3, carry: 1, objectives: 0,
  },
  BOTTOM: {
    kda: 14, killParticipation: 10, farm: 18, damage: 19,
    damageShare: 16, multikills: 4, vision: 3, goldEfficiency: 9,
    survival: 5, consistency: 2, carry: 0, objectives: 0,
  },
  UTILITY: {
    kda: 10, killParticipation: 22, farm: 1, damage: 5,
    damageShare: 3, multikills: 0, vision: 25, goldEfficiency: 3,
    survival: 10, consistency: 8, carry: 3, objectives: 10,
  },
  "": {
    kda: 14, killParticipation: 13, farm: 11, damage: 13,
    damageShare: 10, multikills: 2, vision: 9, goldEfficiency: 8,
    survival: 9, consistency: 5, carry: 2, objectives: 4,
  },
};

const ROLE_TARGETS: Record<SupportedRole, { kda: number; csPerMin: number }> = {
  TOP: { kda: 3.0, csPerMin: 7.8 },
  JUNGLE: { kda: 3.5, csPerMin: 5.5 },
  MIDDLE: { kda: 3.4, csPerMin: 8.2 },
  BOTTOM: { kda: 3.2, csPerMin: 8.8 },
  UTILITY: { kda: 3.5, csPerMin: 1.8 },
  "": { kda: 3.2, csPerMin: 7.0 },
};

function resolveRole(role: unknown): SupportedRole {
  return ROLE_ALIASES[String(role ?? "")] ?? "";
}

function metricMap(metrics: MetricLike[] | undefined): Record<MetricKey, number> {
  const result = {} as Record<MetricKey, number>;
  for (const key of Object.keys(METRIC_NAMES) as MetricKey[]) {
    const aliases = METRIC_NAMES[key];
    const found = (metrics ?? []).find((metric) => aliases.includes(String(metric.name ?? "")));
    result[key] = clamp(Number(found?.value ?? 50));
  }
  return result;
}

function weightedMetricScore(metrics: Record<MetricKey, number>, role: SupportedRole): number {
  const weights = ROLE_WEIGHTS[role];
  let weighted = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights) as MetricKey[]) {
    weighted += metrics[key] * weights[key];
    totalWeight += weights[key];
  }
  return totalWeight > 0 ? weighted / totalWeight : 50;
}

function gradeFromScore(score: number): string {
  if (score >= 88) return "S+";
  if (score >= 78) return "S";
  if (score >= 68) return "A";
  if (score >= 55) return "B";
  if (score >= 42) return "C";
  if (score >= 28) return "D";
  return "F";
}

function exponentialMean(values: number[], decay = 0.9): number {
  if (values.length === 0) return 50;
  let weighted = 0;
  let totalWeight = 0;
  values.forEach((value, index) => {
    const weight = Math.pow(decay, index);
    weighted += clamp(value) * weight;
    totalWeight += weight;
  });
  return weighted / totalWeight;
}

function scoreAgainstTarget(value: number, target: number): number {
  if (target <= 0 || value <= 0) return 0;
  return clamp(80 * Math.sqrt(value / target));
}

function rescoreTimelineMatch(match: TimelineLike, role: SupportedRole): number {
  const target = ROLE_TARGETS[role];
  const durationMinutes = Math.max(Number(match.gameDuration ?? 0) / 60, 1);
  const deathsPerMinute = Number(match.deaths ?? 0) / durationMinutes;
  const kda = Number(match.kda ?? ((Number(match.kills ?? 0) + Number(match.assists ?? 0)) / Math.max(Number(match.deaths ?? 0), 1)));
  const kdaScore = scoreAgainstTarget(kda, target.kda);
  const farmScore = role === "UTILITY" ? 55 : scoreAgainstTarget(Number(match.csPerMin ?? 0), target.csPerMin);
  const survivalScore = clamp(100 - deathsPerMinute * 360);
  const outcomeScore = match.win ? 65 : 45;
  const compactScore = role === "UTILITY"
    ? kdaScore * 0.36 + farmScore * 0.04 + survivalScore * 0.35 + outcomeScore * 0.25
    : kdaScore * 0.35 + farmScore * 0.28 + survivalScore * 0.22 + outcomeScore * 0.15;
  const legacyScore = clamp(Number(match.performanceScore ?? compactScore));
  const legacyWeight = role === "UTILITY" ? 0.72 : 0.58;
  return clamp(legacyScore * legacyWeight + compactScore * (1 - legacyWeight));
}

function confidence(totalGames: number, primaryRoleShare: number): { value: number; label: string } {
  const sample = clamp((totalGames / 20) * 100);
  const roleStability = clamp(primaryRoleShare);
  const value = Math.round(sample * 0.72 + roleStability * 0.28);
  const label = value >= 78 ? "Wysoka" : value >= 52 ? "Średnia" : "Niska";
  return { value, label };
}

function primaryRoleShare(response: AnalysisLike): number {
  const distribution = response.roleDistribution ?? {};
  const values = Object.values(distribution).map(Number).filter(Number.isFinite);
  return values.length > 0 ? clamp(Math.max(...values)) : 100;
}

export function enhanceAnalysisV2(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const response = input as AnalysisLike;
  if (!Array.isArray(response.metrics) || typeof response.overallScore !== "number") return input;

  const role = resolveRole(response.primaryRole);
  const totalGames = Math.max(0, Number(response.totalGamesAnalyzed ?? 0));
  const legacyOverallScore = clamp(Number(response.overallScore));
  const legacyOverallRating = String(response.overallRating ?? gradeFromScore(legacyOverallScore));
  const metrics = metricMap(response.metrics);
  const roleAwareScore = weightedMetricScore(metrics, role);

  const reliability = totalGames / (totalGames + 8);
  const stabilizedRoleScore = 55 + (roleAwareScore - 55) * reliability;

  const estimatedWins = clamp(Number(response.winRate ?? 0)) / 100 * totalGames;
  const shrunkWinRate = ((estimatedWins + 6) / Math.max(totalGames + 12, 12)) * 100;

  const rescoredTimeline = (response.matchTimeline ?? []).map((match) => ({
    ...match,
    performanceScore: Math.round(rescoreTimelineMatch(match, role)),
  }));
  const recentFormScore = exponentialMean(
    rescoredTimeline.map((match) => Number(match.performanceScore ?? 50)),
  );

  const overallScore = Math.round(clamp(
    stabilizedRoleScore * 0.70 + recentFormScore * 0.20 + shrunkWinRate * 0.10,
  ));
  const overallRating = gradeFromScore(overallScore);

  const scoreByMatchId = new Map(
    rescoredTimeline.map((match) => [String(match.matchId ?? ""), Number(match.performanceScore ?? 0)]),
  );

  const championBreakdown = (response.championBreakdown ?? []).map((champion) => {
    const games = Math.max(0, Number(champion.gamesPlayed ?? 0));
    const rawScore = clamp(Number(champion.performanceScore ?? overallScore));
    const sampleWeight = games / (games + 5);
    return {
      ...champion,
      performanceScore: Math.round(overallScore + (rawScore - overallScore) * sampleWeight),
    };
  });

  const patchHighlight = (highlight: AnalysisLike["bestGame"]): AnalysisLike["bestGame"] => {
    if (!highlight) return highlight;
    const score = scoreByMatchId.get(String(highlight.matchId ?? ""));
    return score === undefined ? highlight : { ...highlight, performanceScore: Math.round(score) };
  };

  const scoreConfidence = confidence(totalGames, primaryRoleShare(response));

  return {
    ...response,
    overallScore,
    overallRating,
    championBreakdown,
    matchTimeline: rescoredTimeline,
    bestGame: patchHighlight(response.bestGame),
    worstGame: patchHighlight(response.worstGame),
    algorithmVersion: "2.0",
    legacyOverallScore,
    legacyOverallRating,
    scoreConfidence,
    scoreBreakdown: {
      role,
      roleAwareScore: round1(roleAwareScore),
      stabilizedRoleScore: round1(stabilizedRoleScore),
      recentFormScore: round1(recentFormScore),
      shrunkWinRate: round1(shrunkWinRate),
      sampleReliability: round1(reliability * 100),
    },
  };
}
