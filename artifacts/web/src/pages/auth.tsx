import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    setTimeout(() => setLocation("/"), 0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim() || undefined);
      }
      setLocation("/");
    } catch (err: any) {
      setError(err?.message ?? "Coś poszło nie tak");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            NEXUS SIGHT
          </h1>
          <p className="text-sm text-slate-400 uppercase tracking-widest">
            {mode === "login" ? "Zaloguj się do swojego konta" : "Utwórz nowe konto"}
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide transition ${mode === "login" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >Logowanie</button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide transition ${mode === "register" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >Rejestracja</button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Nazwa wyświetlana (opcjonalnie)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="np. Ahri Main"
                />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="twoj@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Hasło</label>
              <input
                type="password"
                required
                minLength={mode === "register" ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder={mode === "register" ? "min. 8 znaków" : "•••••••"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-bold py-2.5 rounded-lg uppercase tracking-wide transition"
            >
              {busy ? "Czekaj…" : mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
            </button>
          </form>

          <div className="mt-6 text-xs text-slate-500 text-center leading-relaxed">
            Po zalogowaniu otrzymujesz dzienny limit:
            <div className="mt-1 text-slate-400">3 wyszukiwania · 1 analiza AI · 2 optymalizatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
