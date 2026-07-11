import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function AuthHeader() {
  const { user, usage, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;

  return (
    <div className="w-full bg-slate-950/95 border-b border-slate-800 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-3 text-xs">
        <Link href="/" className="font-bold text-cyan-400 uppercase tracking-wider text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          NEXUS SIGHT
        </Link>
        {user.isAdmin ? (
          <Link href="/admin" className="hidden sm:inline-block bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded uppercase tracking-wider font-semibold hover:bg-yellow-500/30 transition-colors">
            Admin · Panel
          </Link>
        ) : usage && (
          <div className="hidden md:flex items-center gap-3 text-slate-400">
            <span>Wyszuk.: <b className={usage.search.used >= usage.search.limit ? "text-red-400" : "text-cyan-300"}>{usage.search.used}/{usage.search.limit}</b></span>
            <span>AI: <b className={usage.ai_analysis.used >= usage.ai_analysis.limit ? "text-red-400" : "text-cyan-300"}>{usage.ai_analysis.used}/{usage.ai_analysis.limit}</b></span>
            <span>Coach: <b className={usage.optimizer.used >= usage.optimizer.limit ? "text-red-400" : "text-cyan-300"}>{usage.optimizer.used}/{usage.optimizer.limit}</b></span>
          </div>
        )}
        <div className="flex-1" />
        <span className="text-slate-400 hidden sm:inline">{user.displayName ?? user.email}</span>
        <button
          onClick={async () => { await logout(); setLocation("/auth"); }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded uppercase tracking-wider font-semibold"
        >Wyloguj</button>
      </div>
    </div>
  );
}
