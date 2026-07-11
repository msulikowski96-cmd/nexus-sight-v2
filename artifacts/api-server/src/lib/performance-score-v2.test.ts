import assert from "node:assert/strict";
import test from "node:test";
import { enhanceAnalysisV2 } from "./performance-score-v2";

const metrics = [
  ["KDA", 72], ["Uczestnictwo w zabójstwach", 74], ["Efektywność CS", 80],
  ["Obrażenia", 78], ["Udział w obrażeniach drużyny", 76], ["Multikille", 50],
  ["Kontrola wizji", 45], ["Efektywność złota", 72], ["Przeżywalność", 68],
  ["Konsekwencja", 66], ["Potencjał carry", 70], ["Kontrola obiektywów", 48],
].map(([name, value]) => ({ name, value }));

test("V2 keeps the old payload and adds version metadata", () => {
  const result = enhanceAnalysisV2({
    overallScore: 70,
    overallRating: "A",
    totalGamesAnalyzed: 20,
    winRate: 55,
    primaryRole: "ADC",
    roleDistribution: { ADC: 80, Mid: 20 },
    metrics,
    championBreakdown: [],
    matchTimeline: [],
  }) as Record<string, unknown>;

  assert.equal(result.algorithmVersion, "2.0");
  assert.equal(result.legacyOverallScore, 70);
  assert.equal(typeof result.overallScore, "number");
});

test("small champion samples are shrunk toward the overall score", () => {
  const result = enhanceAnalysisV2({
    overallScore: 60,
    overallRating: "B",
    totalGamesAnalyzed: 10,
    winRate: 50,
    primaryRole: "Mid",
    roleDistribution: { Mid: 100 },
    metrics,
    championBreakdown: [{ championName: "Ahri", gamesPlayed: 1, performanceScore: 100 }],
    matchTimeline: [],
  }) as any;

  assert.ok(result.championBreakdown[0].performanceScore < 80);
  assert.ok(result.championBreakdown[0].performanceScore > result.overallScore);
});

test("support scoring does not punish farm like an ADC score", () => {
  const supportMetrics = metrics.map((metric) =>
    metric.name === "Efektywność CS" ? { ...metric, value: 10 } : metric,
  );
  const base = {
    overallScore: 60,
    overallRating: "B",
    totalGamesAnalyzed: 20,
    winRate: 50,
    roleDistribution: { Support: 100 },
    metrics: supportMetrics,
    championBreakdown: [],
    matchTimeline: [],
  };

  const support = enhanceAnalysisV2({ ...base, primaryRole: "Support" }) as any;
  const adc = enhanceAnalysisV2({ ...base, primaryRole: "ADC" }) as any;
  assert.ok(support.scoreBreakdown.roleAwareScore > adc.scoreBreakdown.roleAwareScore);
});
