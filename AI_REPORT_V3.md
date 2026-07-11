# Nexus Sight — AI Report V3

Raport AI korzysta z niezależnego Algorithm V2 jako jedynego źródła ocen i liczb. Model językowy nie wylicza ponownie wyniku gracza — jego zadaniem jest interpretacja danych oraz przygotowanie czytelnego raportu coachingowego.

## Modele

Domyślna kolejność:

1. `qwen/qwen3-next-80b-a3b-instruct` — główny model raportu,
2. `meta/llama-3.3-70b-instruct` — model awaryjny,
3. `meta/llama-3.1-8b-instruct` — ostatni model zgodności.

Konfigurację można zmienić na Renderze:

```text
NVIDIA_AI_MODEL=qwen/qwen3-next-80b-a3b-instruct
NVIDIA_AI_FALLBACK_MODEL=meta/llama-3.3-70b-instruct
```

Nadal wymagana jest zmienna:

```text
NVIDIA_API_KEY=...
```

## Przepływ generowania

1. API pobiera rangę, mastery oraz ostatnie mecze.
2. Surowe dane meczowe są przekazywane do `analysis-engine-v2.ts`.
3. Do modelu trafia ustrukturyzowany zestaw danych V2, a nie luźny opis statystyk.
4. Odpowiedź modelu jest wycinana do pojedynczego obiektu JSON.
5. Zod sprawdza typy i strukturę odpowiedzi.
6. Kluczowe liczby są ponownie uziemiane w V2:
   - overall score i rating,
   - ocena formy,
   - konsekwencja,
   - radar umiejętności,
   - priorytety poprawy,
   - cele i szacowany wpływ LP.
7. Gdy model lub JSON zawiedzie, API próbuje kolejnego modelu.
8. Gdy wszystkie modele zawiodą albo brakuje klucza, zwracany jest pełny raport deterministyczny z danych V2.

## Zabezpieczenia przed halucynacjami

Prompt zabrania wymyślania:

- statystyk niewystępujących w danych,
- patcha i aktualnej mety,
- konkretnych matchupów,
- wydarzeń w określonych minutach,
- nieudokumentowanych średnich rangowych.

`rankBenchmarks` są opisywane jako cele porównawcze V2 dla roli, a nie jako oficjalne globalne średnie Riot.

## Metadane odpowiedzi

Endpoint `/api/summoner/:puuid/ai-report` zwraca dodatkowe pole `meta`:

- `pipelineVersion`,
- `sourceAlgorithmVersion`,
- `model`,
- `primaryModel`,
- `fallbackModel`,
- `generationMode`,
- `attempts`,
- `generationTimeMs`,
- `scoreConfidence`.

Frontend zachowuje zgodność z dotychczasowym polem `report` i `stats`.
