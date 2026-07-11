import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { PlayerCard } from './PlayerCard';

interface Props {
  session: any;
  summonerList: any[];
  nexusProfiles: Record<string, any>;
  region: string;
  currentSummoner: any;
}

function buildTeamPlayers(teamArr: any[], summonerList: any[], nexusProfiles: Record<string, any>, currentSummonerId: number) {
  return (teamArr || []).map((p: any) => {
    const summoner = summonerList.find(s => s.summonerId === p.summonerId);
    const gameName = summoner?.gameName || `Gracz ${p.summonerId}`;
    const tagLine = summoner?.tagLine || 'EUW';
    const key = `${gameName}#${tagLine}`;
    return {
      ...p,
      gameName,
      tagLine,
      nexusData: nexusProfiles[key] || null,
      isCurrentUser: p.summonerId === currentSummonerId,
    };
  });
}

export function ChampSelectPanel({ session, summonerList, nexusProfiles, region, currentSummoner }: Props) {
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm font-body">Ładowanie champion selecta…</p>
        </div>
      </div>
    );
  }

  const currentId = currentSummoner?.summonerId;
  const blueTeam = buildTeamPlayers(session.myTeam || [], summonerList, nexusProfiles, currentId);
  const redTeam = buildTeamPlayers(session.theirTeam || [], summonerList, nexusProfiles, currentId);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Blue team */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="font-display font-bold text-blue-300 uppercase tracking-wider text-xs">Twoja Drużyna</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {blueTeam.length > 0 ? blueTeam.map((p, i) => (
            <PlayerCard
              key={p.summonerId || i}
              gameName={p.gameName}
              tagLine={p.tagLine}
              region={region}
              nexusData={p.nexusData}
              isCurrentUser={p.isCurrentUser}
              isBlue={true}
              index={i}
              champName={p.championName || undefined}
            />
          )) : (
            <EmptyTeam />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="flex-1 h-px bg-white/8" />
        <Users size={12} className="text-white/20 flex-shrink-0" />
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Red team */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <span className="font-display font-bold text-red-300 uppercase tracking-wider text-xs">Wróg</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {redTeam.length > 0 ? redTeam.map((p, i) => (
            <PlayerCard
              key={p.summonerId || i}
              gameName={p.gameName}
              tagLine={p.tagLine}
              region={region}
              nexusData={p.nexusData}
              isCurrentUser={false}
              isBlue={false}
              index={i}
              champName={p.championName || undefined}
            />
          )) : (
            <EmptyTeam />
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 pb-3 mt-auto">
        <div className="text-center text-white/20 text-[10px] font-body">
          Dane z Nexus Sight · Aktualizacja co 3s
        </div>
      </div>
    </div>
  );
}

function EmptyTeam() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-[52px] rounded-xl bg-white/3 border border-white/6 animate-pulse" />
      ))}
    </div>
  );
}
