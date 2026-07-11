# Nexus Sight — Algorithm V2

Algorithm V2 działa jako warstwa zgodna wstecznie nad dotychczasową analizą.
Nie zmienia endpointu ani pól używanych przez frontend.

## Najważniejsze zmiany

- osobne wagi dla Top, Jungle, Mid, ADC i Supporta,
- stabilizacja wyniku przy małej liczbie meczów,
- Bayesian shrinkage win rate do 50%,
- większa waga najnowszych meczów,
- ograniczenie wpływu pojedynczego ekstremalnego meczu,
- stabilizacja ocen championów przy 1–5 grach,
- wynik pewności zależny od liczby meczów i stabilności roli,
- zachowanie starego wyniku w `legacyOverallScore` do porównań.

## Pola dodane do odpowiedzi

- `algorithmVersion: "2.0"`
- `legacyOverallScore`
- `legacyOverallRating`
- `scoreConfidence`
- `scoreBreakdown`

## Integracja

W `routes/index.ts` import `./analysis` został zastąpiony przez `./analysis-v2`.
Wrapper uruchamia dotychczasową analizę i bezpiecznie przelicza wynik przed wysłaniem odpowiedzi.
Jeżeli przeliczenie V2 zakończy się błędem, API zwraca niezmienioną odpowiedź V1.
