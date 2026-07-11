import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  gameName: string;
  tagLine: string;
  region: string;
  nexusData?: any;
  isCurrentUser?: boolean;
  isBlue?: boolean;
  index?: number;
  champName?: string;
  champId?: number;
}

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: 'text-yellow-300',
  GRANDMASTER: 'text-red-400',
  MASTER: 'text-purple-400',
  DIAMOND: 'text-cyan-400',
  EMERALD: 'text-emerald-400',
  PLATINUM: 'text-teal-400',
  GOLD: 'text-yellow-500',
  SILVER: 'text-slate-300',
  BRONZE: 'text-amber-700',
  IRON: 'text-slate-500',
};

const TIER_SHORT: Record<string, string> = {
  CHALLENGER: 'CHL', GRANDMASTER: 'GM', MASTER: 'MST',
  DIAMOND: 'DIA', EMERALD: 'EMR', PLATINUM: 'PLA',
  GOLD: 'GLD', SILVER: 'SLV', BRONZE: 'BRZ', IRON: 'IRN',
};

function getRankInfo(data: any) {
  if (!data?.data?.rankedStats) return null;
  const solo = data.data.rankedStats?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  if (!solo) return null;
  return solo;
}

function getWinRate(rank: any) {
  if (!rank) return null;
  const total = rank.wins + rank.losses;
  if (!total) return null;
  return Math.round((rank.wins / total) * 100);
}

export function PlayerCard({ gameName, tagLine, nexusData, isCurrentUser, isBlue, index = 0, champName }: Props) {
  const rank = getRankInfo(nexusData);
  const winRate = getWinRate(rank);
  const opScore = nexusData?.data?.opScore;
  const loading = !nexusData;

  const borderColor = isBlue ? 'border-blue-500/20' : 'border-red-500/20';
  const accentColor = isBlue ? 'text-blue-400' : 'text-red-400';
  const bgColor = isBlue ? 'bg-blue-500/5' : 'bg-red-500/5';
  const highlightBorder = isCurrentUser ? (isBlue ? 'border-l-2 border-l-blue-400' : 'border-l-2 border-l-red-400') : '';

  return (
    <motion.div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${borderColor} ${bgColor} ${highlightBorder} relative overflow-hidden`}
      initial={{ opacity: 0, x: isBlue ? -15 : 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {isCurrentUser && (
        <div className={`absolute inset-0 ${isBlue ? 'bg-blue-500/5' : 'bg-red-500/5'}`} />
      )}

      {/* Champ placeholder / icon */}
      <div className={`w-9 h-9 rounded-lg ${isBlue ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-red-500/15 border border-red-500/20'} flex items-center justify-center flex-shrink-0 relative z-10`}>
        {champName ? (
          <span className="font-display font-bold text-white text-sm">{champName[0]}</span>
        ) : (
          <span className="font-display font-bold text-white/30 text-xs">?</span>
        )}
      </div>

      {/* Summoner name */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1">
          <span className="font-body font-medium text-white text-xs truncate max-w-[90px]">{gameName}</span>
          {isCurrentUser && <span className={`text-[9px] ${accentColor} font-body font-semibold flex-shrink-0`}>TY</span>}
        </div>
        {champName && (
          <div className="text-white/40 text-[10px] font-body truncate">{champName}</div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end gap-0.5 relative z-10 flex-shrink-0">
        {loading ? (
          <Loader2 size={12} className="text-white/20 animate-spin" />
        ) : rank ? (
          <>
            <span className={`font-display font-bold text-xs leading-none ${TIER_COLORS[rank.tier] || 'text-white'}`}>
              {TIER_SHORT[rank.tier] || rank.tier?.slice(0,3)} {rank.rank}
            </span>
            <span className="text-white/40 font-body text-[10px]">{rank.leaguePoints} LP</span>
            {winRate !== null && (
              <span className={`text-[10px] font-body ${winRate >= 55 ? 'text-green-400' : winRate < 45 ? 'text-red-400' : 'text-white/40'}`}>
                {winRate}% WR
              </span>
            )}
          </>
        ) : (
          <span className="text-white/25 text-[10px] font-body">Unranked</span>
        )}
        {opScore && (
          <span className="text-primary text-[9px] font-body">OP {opScore}</span>
        )}
      </div>
    </motion.div>
  );
}
