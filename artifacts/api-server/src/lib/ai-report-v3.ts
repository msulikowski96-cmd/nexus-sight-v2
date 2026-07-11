import OpenAI from "openai";
import { z } from "zod";

export const AI_REPORT_PIPELINE_VERSION = "3.0-grounded-v2";
export const PRIMARY_AI_MODEL = process.env.NVIDIA_AI_MODEL?.trim() || "qwen/qwen3-next-80b-a3b-instruct";
export const FALLBACK_AI_MODEL = process.env.NVIDIA_AI_FALLBACK_MODEL?.trim() || "meta/llama-3.3-70b-instruct";
const LEGACY_AI_MODEL = "meta/llama-3.1-8b-instruct";

const ratingValues = ["S+", "S", "A+", "A", "B+", "B", "C+", "C", "D"] as const;
const formValues = ["Świetna forma", "Dobra forma", "Stabilna", "Zmienna", "Słaba forma", "Kryzys"] as const;
const priorityValues = ["high", "medium", "low"] as const;
const categoryValues = ["macro", "micro", "mental", "vision", "champion_pool"] as const;

const CoachingTipSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(priorityValues),
  category: z.enum(categoryValues),
});

const ChampionRecommendationSchema = z.object({
  champion: z.string(),
  reason: z.string(),
  synergy: z.string(),
});

const ImprovementPrioritySchema = z.object({
  rank: z.coerce.number(),
  area: z.string(),
  current: z.string(),
  target: z.string(),
  description: z.string(),
  lp_gain_estimate: z.coerce.number(),
});

const WeaknessDetailSchema = z.object({
  title: z.string(),
  stat: z.string(),
  impact: z.string(),
  fix: z.string(),
});

const RadarSchema = z.object({
  makro: z.coerce.number(),
  mikro: z.coerce.number(),
  wizja: z.coerce.number(),
  konsekwencja: z.coerce.number(),
  teamfight: z.coerce.number(),
  laning: z.coerce.number(),
});

const AiReportDraftSchema = z.object({
  executive_summary: z.string().optional(),
  overall_rating: z.enum(ratingValues).optional(),
  overall_score: z.coerce.number().optional(),
  form_assessment: z.enum(formValues).optional(),
  playstyle_archetype: z.string().optional(),
  playstyle_description: z.string().optional(),
  champion_pool_analysis: z.string().optional(),
  macro_analysis: z.string().optional(),
  micro_analysis: z.string().optional(),
  lane_phase_analysis: z.string().optional(),
  teamfight_analysis: z.string().optional(),
  death_analysis: z.string().optional(),
  vision_analysis: z.string().optional(),
  mental_game: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  coaching_tips: z.array(CoachingTipSchema).optional(),
  champion_recommendations: z.array(ChampionRecommendationSchema).optional(),
  rank_prediction: z.string().optional(),
  consistency_score: z.coerce.number().optional(),
  consistency_comment: z.string().optional(),
  motivation_quote: z.string().optional(),
  performance_radar: RadarSchema.optional(),
  improvement_priorities: z.array(ImprovementPrioritySchema).optional(),
  key_weaknesses_detailed: z.array(WeaknessDetailSchema).optional(),
  biggest_mistake_pattern: z.string().optional(),
  best_habit: z.string().optional(),
}).passthrough();

export type AiReport = {
  executive_summary: string;
  overall_rating: (typeof ratingValues)[number];
  overall_score: number;
  form_assessment: (typeof formValues)[number];
  playstyle_archetype: string;
  playstyle_description: string;
  champion_pool_analysis: string;
  macro_analysis: string;
  micro_analysis: string;
  lane_phase_analysis: string;
  teamfight_analysis: string;
  death_analysis: string;
  vision_analysis: string;
  mental_game: string;
  strengths: string[];
  weaknesses: string[];
  coaching_tips: z.infer<typeof CoachingTipSchema>[];
  champion_recommendations: z.infer<typeof ChampionRecommendationSchema>[];
  rank_prediction: string;
  consistency_score: number;
  consistency_comment: string;
  motivation_quote: string;
  performance_radar: z.infer<typeof RadarSchema>;
  improvement_priorities: z.infer<typeof ImprovementPrioritySchema>[];
  key_weaknesses_detailed: z.infer<typeof WeaknessDetailSchema>[];
  biggest_mistake_pattern: string;
  best_habit: string;
};

export interface AiReportContext {
  gameName: string;
  soloQ?: any;
  flexQ?: any;
  mastery: Array<{ championName: string; championLevel: number; championPoints: number; lastPlayTime?: number }>;
  stats: any;
  analysis: any;
}

export interface AiGenerationResult {
  report: AiReport;
  model: string;
  mode: "model" | "deterministic-fallback";
  attempts: Array<{ model: string; ok: boolean; reason?: string }>;
}

const clamp100 = (value: unknown): number => Math.round(Math.max(0, Math.min(100, Number(value) || 0)));
const text = (value: unknown, fallback: string): string => typeof value === "string" && value.trim() ? value.trim() : fallback;

function uniqueStrings(values: unknown[], fallbacks: unknown[], count: number): string[] {
  const result: string[] = [];
  for (const item of [...values, ...fallbacks]) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized || result.includes(normalized)) continue;
    result.push(normalized);
    if (result.length >= count) break;
  }
  while (result.length < count) result.push("Brak wystarczających danych do sformułowania kolejnego niezależnego wniosku.");
  return result;
}

function ratingFromScore(score: number): AiReport["overall_rating"] {
  if (score >= 90) return "S+";
  if (score >= 82) return "S";
  if (score >= 74) return "A+";
  if (score >= 66) return "A";
  if (score >= 58) return "B+";
  if (score >= 50) return "B";
  if (score >= 42) return "C+";
  if (score >= 34) return "C";
  return "D";
}

function formFromTrend(trend: unknown): AiReport["form_assessment"] {
  switch (String(trend ?? "")) {
    case "hot": return "Świetna forma";
    case "improving": return "Dobra forma";
    case "declining": return "Słaba forma";
    case "cold": return "Kryzys";
    case "stable": return "Stabilna";
    default: return "Zmienna";
  }
}

function categoryForArea(area: string): AiReport["coaching_tips"][number]["category"] {
  const value = area.toLowerCase();
  if (value.includes("wizj") || value.includes("informac")) return "vision";
  if (value.includes("mental") || value.includes("ryzyk") || value.includes("przeży")) return "mental";
  if (value.includes("champ") || value.includes("bohater")) return "champion_pool";
  if (value.includes("boj") || value.includes("ekonom") || value.includes("lini") || value.includes("mikro")) return "micro";
  return "macro";
}

function compactPromptData(context: AiReportContext) {
  const a = context.analysis ?? {};
  return {
    player: context.gameName,
    ranked: {
      soloQ: context.soloQ ? {
        tier: context.soloQ.tier,
        division: context.soloQ.rank,
        lp: context.soloQ.leaguePoints,
        wins: context.soloQ.wins,
        losses: context.soloQ.losses,
      } : null,
      flexQ: context.flexQ ? {
        tier: context.flexQ.tier,
        division: context.flexQ.rank,
        lp: context.flexQ.leaguePoints,
        wins: context.flexQ.wins,
        losses: context.flexQ.losses,
      } : null,
    },
    mastery: context.mastery.slice(0, 7),
    rawSummary: context.stats,
    algorithmV2: {
      algorithmVersion: a.algorithmVersion,
      overallScore: a.overallScore,
      overallRating: a.overallRating,
      totalGamesAnalyzed: a.totalGamesAnalyzed,
      winRate: a.winRate,
      primaryRole: a.primaryRole,
      roleDistribution: a.roleDistribution,
      scoreConfidence: a.scoreConfidence,
      scoreBreakdown: a.scoreBreakdown,
      metrics: a.metrics,
      strengths: a.strengths,
      weaknesses: a.weaknesses,
      playstyleArchetype: a.playstyleArchetype,
      playstyleDescription: a.playstyleDescription,
      criticalMistakes: a.criticalMistakes,
      gameplayPatterns: a.gameplayPatterns,
      championBreakdown: Array.isArray(a.championBreakdown) ? a.championBreakdown.slice(0, 7) : [],
      formTrend: a.formTrend,
      lanePhaseStats: a.lanePhaseStats,
      objectiveStats: a.objectiveStats,
      deathAnalysis: a.deathAnalysis,
      tiltIndicator: a.tiltIndicator,
      winConditions: a.winConditions,
      powerCurve: a.powerCurve,
      rankBenchmarks: a.rankBenchmarks,
      improvementRoadmap: a.improvementRoadmap,
      comebackAnalysis: a.comebackAnalysis,
      skillshotStats: a.skillshotStats,
      roleInsights: a.roleInsights,
    },
  };
}

function buildMessages(context: AiReportContext): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const system = `Jesteś analitykiem League of Legends i trenerem ranked. Tworzysz raport po polsku na podstawie wyłącznie przekazanego JSON-u.

ZASADY NIEPODLEGAJĄCE DYSKUSJI:
- Nie wymyślaj statystyk, patcha, mety, matchupów, minut zdarzeń ani danych, których nie ma w wejściu.
- Nie przeliczaj ponownie overallScore. W raporcie użyj dokładnie wyniku Algorithm V2.
- Każdy wniosek musi dać się powiązać z konkretną wartością, komponentem V2 lub tekstem analizy V2.
- Gdy danych brakuje, napisz wprost, że próbka nie pozwala na pewny wniosek.
- Traktuj każdą rolę inaczej. Supporta nie oceniaj za CS jak ADC, a junglera nie oceniaj jak lanera.
- Nie udawaj, że rankBenchmarks są globalną średnią wszystkich graczy. To cele porównawcze V2 dla roli.
- Rekomendacje mają być praktyczne: zachowanie w następnej grze, mierzalny cel i powód.
- Odpowiedź ma być jednym poprawnym obiektem JSON. Bez markdownu, komentarzy i tekstu poza JSON-em.`;

  const shape = {
    executive_summary: "2-3 konkretne zdania",
    overall_rating: "S+|S|A+|A|B+|B|C+|C|D",
    overall_score: 0,
    form_assessment: "Świetna forma|Dobra forma|Stabilna|Zmienna|Słaba forma|Kryzys",
    playstyle_archetype: "nazwa",
    playstyle_description: "opis",
    champion_pool_analysis: "opis",
    macro_analysis: "opis",
    micro_analysis: "opis",
    lane_phase_analysis: "opis",
    teamfight_analysis: "opis",
    death_analysis: "opis",
    vision_analysis: "opis",
    mental_game: "opis",
    strengths: ["3 elementy"],
    weaknesses: ["3 elementy"],
    coaching_tips: [{ title: "", description: "", priority: "high|medium|low", category: "macro|micro|mental|vision|champion_pool" }],
    champion_recommendations: [{ champion: "", reason: "", synergy: "" }],
    rank_prediction: "ostrożna prognoza",
    consistency_score: 0,
    consistency_comment: "opis",
    motivation_quote: "krótkie motto bez banału",
    performance_radar: { makro: 0, mikro: 0, wizja: 0, konsekwencja: 0, teamfight: 0, laning: 0 },
    improvement_priorities: [{ rank: 1, area: "", current: "", target: "", description: "", lp_gain_estimate: 0 }],
    key_weaknesses_detailed: [{ title: "", stat: "", impact: "", fix: "" }],
    biggest_mistake_pattern: "opis",
    best_habit: "opis",
  };

  const user = `Wygeneruj raport dla gracza ${context.gameName}. Zwróć dokładnie 3 coaching_tips, 2 champion_recommendations, 3 improvement_priorities i 2 key_weaknesses_detailed.

DOZWOLONE DANE ŹRÓDŁOWE:
${JSON.stringify(compactPromptData(context))}

WYMAGANY KSZTAŁT ODPOWIEDZI:
${JSON.stringify(shape)}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function extractJsonObject(raw: string): unknown {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("Model did not return a JSON object");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
    }
  }
  throw new Error("Model returned incomplete JSON");
}

function normalizeReport(draft: z.infer<typeof AiReportDraftSchema>, context: AiReportContext): AiReport {
  const a = context.analysis ?? {};
  const score = clamp100(a.overallScore);
  const stats = context.stats ?? {};
  const v2Strengths = Array.isArray(a.strengths) ? a.strengths : [];
  const v2Weaknesses = Array.isArray(a.weaknesses) ? a.weaknesses : [];
  const roadmap = Array.isArray(a.improvementRoadmap) ? a.improvementRoadmap.slice(0, 3) : [];
  const v2Recommendations = Array.isArray(a.championRecommendations) ? a.championRecommendations : [];
  const components = a.scoreBreakdown?.components ?? {};
  const consistencyMetric = Array.isArray(a.metrics)
    ? a.metrics.find((item: any) => String(item?.name ?? "").toLowerCase().includes("konsekwencja"))
    : null;
  const consistency = clamp100(consistencyMetric?.value ?? a.scoreBreakdown?.consistencyScore ?? draft.consistency_score ?? 50);

  const macro = clamp100((Number(components.objectives ?? 50) + Number(components.teamplay ?? 50) + Number(components.vision ?? 50)) / 3);
  const micro = clamp100((Number(components.combat ?? 50) + Number(components.economy ?? 50) + Number(components.lane ?? 50)) / 3);
  const vision = clamp100(components.vision ?? draft.performance_radar?.wizja ?? 50);
  const teamfight = clamp100((Number(components.combat ?? 50) + Number(components.teamplay ?? 50)) / 2);
  const laning = clamp100(components.lane ?? draft.performance_radar?.laning ?? 50);

  const strengths = uniqueStrings(draft.strengths ?? [], v2Strengths, 3);
  const weaknesses = uniqueStrings(draft.weaknesses ?? [], v2Weaknesses, 3);

  const coachingTips = [0, 1, 2].map((index) => {
    const generated = draft.coaching_tips?.[index];
    const source = roadmap[index];
    const area = text(generated?.title, text(source?.area, `Priorytet ${index + 1}`));
    return {
      title: area,
      description: text(generated?.description, `${text(source?.currentValue, "Obecny wynik")}; cel: ${text(source?.targetValue, "poprawa wyniku")}. ${text(source?.tip, "Skup się na jednym mierzalnym zachowaniu w kolejnych meczach.")}`),
      priority: generated?.priority ?? (index === 0 ? "high" : index === 1 ? "medium" : "low"),
      category: generated?.category ?? categoryForArea(area),
    };
  });

  const championRecommendations = [0, 1].map((index) => {
    const generated = draft.champion_recommendations?.[index];
    const source = v2Recommendations[index];
    return {
      champion: text(generated?.champion, text(source?.championName, context.mastery[index]?.championName ?? "Brak rekomendacji")),
      reason: text(generated?.reason, text(source?.reason, "Wybór zgodny z wykrytym profilem roli i stylem gry.")),
      synergy: text(generated?.synergy, text(source?.playstyleMatch, text(a.playstyleArchetype, "Dopasowanie do profilu V2"))),
    };
  });

  const improvementPriorities = [0, 1, 2].map((index) => {
    const generated = draft.improvement_priorities?.[index];
    const source = roadmap[index];
    return {
      rank: index + 1,
      area: text(source?.area, text(generated?.area, `Obszar ${index + 1}`)),
      current: text(source?.currentValue, text(generated?.current, "Brak pełnej wartości")),
      target: text(source?.targetValue, text(generated?.target, "Mierzalna poprawa")),
      description: text(generated?.description, text(source?.tip, coachingTips[index].description)),
      lp_gain_estimate: Math.max(0, Math.round(Number(source?.estimatedLpGain ?? generated?.lp_gain_estimate ?? 0))),
    };
  });

  const weaknessDetails = [0, 1].map((index) => {
    const generated = draft.key_weaknesses_detailed?.[index];
    const priority = improvementPriorities[index];
    return {
      title: text(generated?.title, priority.area),
      stat: text(generated?.stat, `${priority.current} → ${priority.target}`),
      impact: text(generated?.impact, weaknesses[index]),
      fix: text(generated?.fix, priority.description),
    };
  });

  const rankLabel = context.soloQ
    ? `${context.soloQ.tier} ${context.soloQ.rank}, ${context.soloQ.leaguePoints} LP`
    : "brak rangi SoloQ";

  const topChampions = Array.isArray(a.championBreakdown)
    ? a.championBreakdown.slice(0, 3).map((champion: any) => `${champion.championName}: ${champion.gamesPlayed} gier, ${champion.winRate}% WR, score ${champion.performanceScore}`).join("; ")
    : "brak wystarczającej próbki championów";

  return {
    executive_summary: text(draft.executive_summary, `${context.gameName} ma ${rankLabel}. Niezależny Algorithm V2 ocenia ostatnie ${a.totalGamesAnalyzed ?? stats.totalGames ?? 0} gier na ${score}/100 przy WR ${a.winRate ?? stats.winRate ?? 0}% i głównej roli ${a.primaryRole ?? stats.primaryRole ?? "nieznanej"}.`),
    overall_rating: ratingFromScore(score),
    overall_score: score,
    form_assessment: formFromTrend(a.formTrend?.trend),
    playstyle_archetype: text(draft.playstyle_archetype, text(a.playstyleArchetype, "Profil nieustalony")),
    playstyle_description: text(draft.playstyle_description, text(a.playstyleDescription, "Próbka nie pozwala jeszcze na precyzyjne określenie stylu.")),
    champion_pool_analysis: text(draft.champion_pool_analysis, topChampions),
    macro_analysis: text(draft.macro_analysis, `Makro V2: obiektywy ${clamp100(components.objectives)}, gra zespołowa ${clamp100(components.teamplay)}, wizja ${clamp100(components.vision)}.`),
    micro_analysis: text(draft.micro_analysis, `Mikro V2: walka ${clamp100(components.combat)}, ekonomia ${clamp100(components.economy)}, presja linii ${clamp100(components.lane)}.`),
    lane_phase_analysis: text(draft.lane_phase_analysis, text(a.lanePhaseStats?.description, "Brak wystarczających danych o presji linii.")),
    teamfight_analysis: text(draft.teamfight_analysis, `Komponent walki ${clamp100(components.combat)}/100, gra zespołowa ${clamp100(components.teamplay)}/100, średni KP ${stats.avgKillParticipation ?? "brak"}%.`),
    death_analysis: text(draft.death_analysis, text(a.deathAnalysis?.description, `Średnio ${stats.avgDeaths ?? "brak"} śmierci na mecz.`)),
    vision_analysis: text(draft.vision_analysis, `Wizja V2 ${vision}/100; średnio ${stats.avgVisionScore ?? "brak"} vision score i ${stats.avgControlWards ?? "brak"} control warda na mecz.`),
    mental_game: text(draft.mental_game, text(a.tiltIndicator?.description, "Brak wystarczających danych do oceny mentalu.")),
    strengths,
    weaknesses,
    coaching_tips: coachingTips,
    champion_recommendations: championRecommendations,
    rank_prediction: text(draft.rank_prediction, text(a.predictedTier?.description, "Prognoza rangi ma charakter orientacyjny i zależy od utrzymania obecnej jakości gry na większej próbce.")),
    consistency_score: consistency,
    consistency_comment: text(draft.consistency_comment, `Konsekwencja wykonania wynosi ${consistency}/100 przy pewności analizy ${a.scoreConfidence?.label ?? "nieustalonej"}.`),
    motivation_quote: text(draft.motivation_quote, "Najpierw powtarzalna dobra decyzja, dopiero potem efektowna zagrywka."),
    performance_radar: { makro: macro, mikro: micro, wizja: vision, konsekwencja: consistency, teamfight, laning },
    improvement_priorities: improvementPriorities,
    key_weaknesses_detailed: weaknessDetails,
    biggest_mistake_pattern: text(draft.biggest_mistake_pattern, text(a.criticalMistakes?.[0], "Największa rezerwa leży w szybszej konwersji przewagi na trwały cel mapy.")),
    best_habit: text(draft.best_habit, text(a.strengths?.[0], "Najlepszy nawyk nie jest jeszcze potwierdzony na wystarczającej próbce.")),
  };
}

async function callModel(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  signal?: AbortSignal,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: model.includes("qwen3-next") ? 0.3 : 0.2,
    top_p: 0.8,
    max_tokens: 5200,
    stream: false,
  }, { signal }) as any;

  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Model returned an empty response");
  return content;
}

export async function generateGroundedAiReport(
  client: OpenAI,
  context: AiReportContext,
  signal?: AbortSignal,
): Promise<AiGenerationResult> {
  const attempts: AiGenerationResult["attempts"] = [];
  const models = [...new Set([PRIMARY_AI_MODEL, FALLBACK_AI_MODEL, LEGACY_AI_MODEL].filter(Boolean))];
  const messages = buildMessages(context);

  if (process.env.NVIDIA_API_KEY) {
    for (const model of models) {
      try {
        const raw = await callModel(client, model, messages, signal);
        const extracted = extractJsonObject(raw);
        const validation = AiReportDraftSchema.safeParse(extracted);
        if (!validation.success) {
          attempts.push({ model, ok: false, reason: validation.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
          continue;
        }
        attempts.push({ model, ok: true });
        return {
          report: normalizeReport(validation.data, context),
          model,
          mode: "model",
          attempts,
        };
      } catch (error: any) {
        if (signal?.aborted) throw error;
        attempts.push({ model, ok: false, reason: String(error?.message ?? error).slice(0, 240) });
      }
    }
  } else {
    attempts.push({ model: PRIMARY_AI_MODEL, ok: false, reason: "NVIDIA_API_KEY is not configured" });
  }

  return {
    report: normalizeReport({}, context),
    model: "deterministic-v2-fallback",
    mode: "deterministic-fallback",
    attempts,
  };
}
