# Nexus Sight — niezależny Algorithm V2

Algorithm V2 nie jest już nakładką na wynik V1. Endpoint pobiera surowe dane meczowe z Riot Match API i przekazuje je bezpośrednio do osobnego silnika `analysis-engine-v2.ts`.

Stary plik `routes/analysis.ts` pozostaje w repo jako wersja referencyjna, ale aktywny router korzysta z `routes/analysis-v2.ts`.

## Co V2 liczy od zera

- ocenę każdego meczu,
- ogólny wynik gracza,
- komponenty profilu: walka, ekonomia, gra zespołowa, wizja, przeżywalność, obiektywy i presja linii,
- mocne oraz słabe strony,
- krytyczne błędy i powtarzalne wzorce,
- archetyp stylu gry,
- plan poprawy i wskazówki coachingowe,
- ocenę championów,
- aktualną formę, konsekwencję oraz poziom pewności analizy,
- warunki zwycięstwa, krzywą mocy, analizę śmierci, tiltu i konwersji obiektów.

## Osobne profile ról

Każda rola ma własne cele i wagi:

- **Top:** ekonomia linii, presja boczna, przeżywalność i konwersja wież,
- **Jungle:** KP, tempo mapy, wizja oraz cele neutralne,
- **Mid:** obrażenia, ekonomia, presja środka i rotacje,
- **ADC:** ekonomia, udział w obrażeniach i pozycjonowanie,
- **Support:** wizja, KP, przygotowanie obiektów i ograniczanie śmierci.

Support nie jest oceniany jak carry pod względem CS i obrażeń, a ADC nie otrzymuje takich samych wag jak jungler.

## Stabilizacja statystyczna

- wynik jest stabilizowany przy małej próbce,
- najnowsze mecze mają większą wagę,
- win rate jest zmniejszany w kierunku 50% przy małej liczbie gier,
- oceny championów są zmniejszane w kierunku wyniku całego profilu,
- pewność zależy od liczby meczów i stabilności głównej roli.

## Odpowiedź API

Podstawowy kształt odpowiedzi pozostaje zgodny z frontendem. Dodatkowo zwracane są:

- `algorithmVersion: "2.1-independent"`,
- `scoreConfidence`,
- `scoreBreakdown`,
- `roleInsights`.

Cache V2 ma osobny klucz zawierający wersję silnika, dzięki czemu stare wyniki nie mieszają się z nową analizą.
