import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { StatusScreen } from './components/StatusScreen';
import { ChampSelectPanel } from './components/ChampSelectPanel';
import { LiveGamePanel } from './components/LiveGamePanel';
import { useLCU } from './hooks/useLCU';

export type Phase = 'disconnected' | 'lobby' | 'champ-select' | 'in-game' | 'other';

export interface SummonerProfile {
  gameName: string;
  tagLine: string;
  region: string;
  rank?: string;
  tier?: string;
  lp?: number;
  winRate?: number;
  kda?: number;
  opScore?: number;
  data?: any;
}

export default function App() {
  const { connected, phase, champSelectData, liveGameData, summonerList, nexusProfiles, currentSummoner } = useLCU();
  const [pinned, setPinned] = useState(true);
  const [opacity, setOpacity] = useState(90);
  const [region, setRegion] = useState('euw1');

  const handleTogglePin = useCallback((p: boolean) => {
    setPinned(p);
    window.electronAPI?.togglePin(p);
  }, []);

  const currentPhase: Phase = !connected
    ? 'disconnected'
    : phase === 'ChampSelect'
    ? 'champ-select'
    : phase === 'InProgress'
    ? 'in-game'
    : phase === 'Lobby'
    ? 'lobby'
    : 'other';

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ opacity: opacity / 100 }}
    >
      {/* Main container */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#020c18]/90 backdrop-blur-xl shadow-2xl">
        <TitleBar
          connected={connected}
          phase={currentPhase}
          pinned={pinned}
          opacity={opacity}
          region={region}
          onTogglePin={handleTogglePin}
          onOpacityChange={setOpacity}
          onRegionChange={setRegion}
          currentSummoner={currentSummoner}
        />

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {currentPhase === 'disconnected' && (
              <motion.div key="disconnected" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StatusScreen status="disconnected" />
              </motion.div>
            )}
            {currentPhase === 'lobby' && (
              <motion.div key="lobby" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StatusScreen status="lobby" currentSummoner={currentSummoner} />
              </motion.div>
            )}
            {currentPhase === 'other' && (
              <motion.div key="other" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StatusScreen status="other" />
              </motion.div>
            )}
            {currentPhase === 'champ-select' && (
              <motion.div key="champ-select" className="absolute inset-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <ChampSelectPanel
                  session={champSelectData}
                  summonerList={summonerList}
                  nexusProfiles={nexusProfiles}
                  region={region}
                  currentSummoner={currentSummoner}
                />
              </motion.div>
            )}
            {currentPhase === 'in-game' && (
              <motion.div key="in-game" className="absolute inset-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <LiveGamePanel
                  liveGameData={liveGameData}
                  nexusProfiles={nexusProfiles}
                  region={region}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
