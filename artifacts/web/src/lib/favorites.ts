const KEY = "nexus_sight_favorites";

export type Favorite = { gameName: string; tagLine: string; region: string };

export function getFavorites(): Favorite[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function save(favs: Favorite[]) {
  try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch { /* ignore */ }
}

export function isFavorite(f: Favorite): boolean {
  return getFavorites().some(
    (e) => e.gameName.toLowerCase() === f.gameName.toLowerCase() &&
      e.tagLine.toLowerCase() === f.tagLine.toLowerCase() &&
      e.region === f.region
  );
}

export function toggleFavorite(f: Favorite): boolean {
  const current = getFavorites();
  const exists = current.some(
    (e) => e.gameName.toLowerCase() === f.gameName.toLowerCase() &&
      e.tagLine.toLowerCase() === f.tagLine.toLowerCase() &&
      e.region === f.region
  );
  if (exists) {
    save(current.filter(
      (e) => !(e.gameName.toLowerCase() === f.gameName.toLowerCase() &&
        e.tagLine.toLowerCase() === f.tagLine.toLowerCase() &&
        e.region === f.region)
    ));
    return false;
  } else {
    save([f, ...current].slice(0, 20));
    return true;
  }
}
