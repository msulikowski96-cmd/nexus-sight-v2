# Nexus Sight Overlay — Instrukcja budowania

## Wymagania (na Twoim komputerze Windows)
- Node.js 18+ (https://nodejs.org/)
- pnpm: `npm install -g pnpm`
- Git (opcjonalne)

## Instalacja i budowanie

```bash
# 1. Pobierz kod (sklonuj repozytorium lub pobierz ZIP)
git clone <repozytorium>
cd artifacts/lol-overlay

# 2. Zainstaluj zależności
pnpm install

# 3. Zbuduj instalator Windows (.exe)
pnpm run build:win
```

Instalator pojawi się w `artifacts/lol-overlay/dist-electron/`

## Tryb deweloperski (podgląd bez instalacji)

```bash
pnpm run dev
```

Uruchamia Vite + Electron jednocześnie.

## Jak działa nakładka

1. Uruchom League of Legends
2. Uruchom Nexus Sight Overlay (.exe)
3. Nakładka automatycznie wykrywa klienta LoL przez lockfile
4. Podczas **champion selecta** → pokazuje rangi i statystyki wszystkich 10 graczy
5. **W trakcie gry** → pokazuje KDA na żywo + rangi z Nexus Sight
6. Ciągnie dane z `nexus-sight.onrender.com`

## Konfiguracja

- **Serwer**: zmień w nakładce (EUW1, EUNE1, NA1, KR, itd.)
- **Przezroczystość**: suwak w ustawieniach
- **Przypnij na wierzch**: ikona pinezki
- Można przeciągać okno nakładki

## Struktura projektu

```
electron/
  main.js       ← Electron main process (LCU API, okno, tray)
  preload.js    ← Bezpieczny most między Electron a React
src/
  App.tsx       ← Główna aplikacja React
  hooks/
    useLCU.ts   ← Hook do LCU API i danych Nexus Sight
  components/
    TitleBar.tsx        ← Pasek tytułowy z ustawieniami
    ChampSelectPanel.tsx ← Panel champion selecta
    LiveGamePanel.tsx   ← Panel gry na żywo
    PlayerCard.tsx      ← Karta gracza ze statystykami
    StatusScreen.tsx    ← Ekrany statusu (brak LoL, lobby, itd.)
```
