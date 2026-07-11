import { motion } from 'framer-motion';
import { Clock, Swords, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  liveGameData: any;
  nexusProfiles: Record<string, any>;
  region: string;
}

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: 'text-yellow-300', GRANDMASTER: 'text-red-400', MASTER: 'text-purple-400',
  DIAMOND: 'text-cyan-400', EMERALD: 'text-emerald-400', PLATINUM: 'text-teal-400',
  GOLD: 'text-yellow-500', SILVER: 'text-slate-300', BRONZE: 'text-amber-700', IRON: 'text-slate-500',
};

const TIER_SHORT: Record<string, string> = {
  CHALLENGER: 'CHL', GRANDMASTER: 'GM', MASTER: 'MST', DIAMOND: 'DIA',
  EMERALD: 'EMR', PLATINUM: 'PLA', GOLD: 'GLD', SILVER: 'SLV', BRONZE: 'BRZ', IRON: 'IRN',
};

function GameTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor(Date.now() / 1000 - startTime));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="font-display font-bold text-white tabular-nums">{m}:{s.toString().padStart(2, '0')}</span>;
}

export function LiveGamePanel({ liveGameData, nexusProfiles, region }: Props) {
  if (!liveGameData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <Loader2 className="text-green-400 animate-spin" size={24} />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-white text-lg uppercase tracking-wide mb-1">Gra w toku</h2>
          <p className="font-body text-white/40 text-sm">Pobieranie danych live…</p>
        </div>
      </div>
    );
  }

  const { gameData, allPlayers } = liveGameData;
  const gameTime = gameData?.gameTime || 0;

  const orderTeam = (allPlayers || []).filter((p: any) => p.team === 'ORDER');
  const chaosTeam = (allPlayers || []).filter((p: any) => p.team === 'CHAOS');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Game timer */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-green-400" />
          <span className="text-green-400 text-xs font-body font-medium uppercase tracking-wider">Live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GameTimer startTime={Math.floor(Date.now() / 1000) - gameTime} />
        </div>
        <div className="flex items-center gap-1.5">
          <Swords size={13} className="text-white/30" />
        </div>
      </div>

      {/* Blue (ORDER) team */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="font-display font-bold text-blue-300 uppercase tracking-wider text-xs">Niebieska</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {orderTeam.map((p: any, i: number) => (
            <LivePlayerRow key={i} player={p} nexusProfiles={nexusProfiles} isBlue index={i} />
          ))}
        </div>
      </div>

      {/* VS bar */}
      <div className="px-3 py-1 flex items-center gap-2">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-white/20 text-xs font-display font-bold">VS</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Red (CHAOS) team */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="font-display font-bold text-red-300 uppercase tracking-wider text-xs">Czerwona</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {chaosTeam.map((p: any, i: number) => (
            <LivePlayerRow key={i} player={p} nexusProfiles={nexusProfiles} isBlue={false} index={i} />
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 mt-auto text-center text-white/20 text-[10px] font-body">
        Nexus Sight Live · port 2999
      </div>
    </div>
  );
}

function LivePlayerRow({ player, nexusProfiles, isBlue, index }: { player: any; nexusProfiles: Record<string, any>; isBlue: boolean; index: number }) {
  const name = player.summonerName || player.riotIdGameName || 'Gracz';
  const nexusKey = Object.keys(nexusProfiles).find(k => k.toLowerCase().startsWith(name.toLowerCase()));
  const nexusData = nexusKey ? nexusProfiles[nexusKey] : null;
  const rank = nexusData?.data?.rankedStats?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

  const scores = player.scores;
  const kda = scores ? `${scores.kills}/${scores.deaths}/${scores.assists}` : null;

  return (
    <motion.div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${isBlue ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5'}`}
      initial={{ opacity: 0, x: isBlue ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {/* Champion icon placeholder */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isBlue ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-red-500/15 border border-red-500/20'}`}>
        <span className="font-display font-bold text-white text-sm">{player.championName?.[0] || '?'}</span>
      </div>

      {/* Name + champion */}
      <div className="flex-1 min-w-0">
        <div className="font-body font-medium text-white text-xs truncate max-w-[90px]">{name}</div>
        <div className="text-white/40 text-[10px] font-body truncate">{player.championName}</div>
      </div>

      {/* KDA */}
      {kda && (
        <div className="flex flex-col items-center">
          <span className="font-display font-bold text-white text-xs">{kda}</span>
          <span className="text-white/30 text-[10px] font-body">KDA</span>
        </div>
      )}

      {/* Rank */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {rank ? (
          <>
            <span className={`font-display font-bold text-xs leading-none ${TIER_COLORS[rank.tier] || 'text-white'}`}>
              {TIER_SHORT[rank.tier] || rank.tier?.slice(0, 3)} {rank.rank}
            </span>
            <span className="text-white/40 text-[10px] font-body">{rank.leaguePoints} LP</span>
          </>
        ) : (
          <span className="text-white/25 text-[10px] font-body">Unranked</span>
        )}
      </div>
    </motion.div>
  );
}
