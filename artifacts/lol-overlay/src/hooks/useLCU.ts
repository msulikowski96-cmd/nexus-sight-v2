import { useState, useEffect } from 'react';

export interface LCUSummoner {
  summonerId: number;
  accountId: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  displayName: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface NexusProfile {
  gameName: string;
  tagLine: string;
  region: string;
  data: any;
}

export function useLCU() {
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<string>('None');
  const [champSelectData, setChampSelectData] = useState<any>(null);
  const [liveGameData, setLiveGameData] = useState<any>(null);
  const [summonerList, setSummonerList] = useState<LCUSummoner[]>([]);
  const [nexusProfiles, setNexusProfiles] = useState<Record<string, NexusProfile>>({});
  const [currentSummoner, setCurrentSummoner] = useState<LCUSummoner | null>(null);

  useEffect(() => {
    // If running in browser (not Electron), use mock data for UI testing
    if (!window.electronAPI) {
      simulateMockData(setConnected, setPhase, setChampSelectData, setLiveGameData, setSummonerList, setNexusProfiles, setCurrentSummoner);
      return;
    }

    window.electronAPI.onLcuStatus((data: { connected: boolean }) => {
      setConnected(data.connected);
      if (!data.connected) {
        setPhase('None');
        setChampSelectData(null);
        setLiveGameData(null);
      }
    });

    window.electronAPI.onLcuPhase((p: string) => setPhase(p));

    window.electronAPI.onChampSelect((session: any) => {
      setChampSelectData(session);
    });

    window.electronAPI.onLiveGame((data: any) => {
      setLiveGameData(data);
    });

    window.electronAPI.onSummoner((s: LCUSummoner) => {
      setCurrentSummoner(s);
    });

    window.electronAPI.onSummonerList((list: LCUSummoner[]) => {
      setSummonerList(list);
    });

    window.electronAPI.onNexusProfile((p: NexusProfile) => {
      setNexusProfiles(prev => ({
        ...prev,
        [`${p.gameName}#${p.tagLine}`]: p,
      }));
    });

    return () => {
      ['lcu:status', 'lcu:phase', 'lcu:champ-select', 'lcu:live-game', 'lcu:summoner', 'lcu:summoner-list', 'nexus:profile'].forEach(ch => {
        window.electronAPI?.removeAllListeners(ch);
      });
    };
  }, []);

  return { connected, phase, champSelectData, liveGameData, summonerList, nexusProfiles, currentSummoner };
}

// ─── Mock data for browser preview ───
function simulateMockData(
  setConnected: any, setPhase: any, setChampSelectData: any, setLiveGameData: any,
  setSummonerList: any, setNexusProfiles: any, setCurrentSummoner: any
) {
  setTimeout(() => {
    setConnected(true);
    setPhase('ChampSelect');
    setCurrentSummoner({ gameName: 'Faker', tagLine: 'T1', displayName: 'Faker', profileIconId: 1, summonerLevel: 500, summonerId: 1, accountId: 1, puuid: '' });

    const mockSummoners = [
      { gameName: 'Faker', tagLine: 'T1', displayName: 'Faker' },
      { gameName: 'Zeus', tagLine: 'T1', displayName: 'Zeus' },
      { gameName: 'Oner', tagLine: 'T1', displayName: 'Oner' },
      { gameName: 'Gumayusi', tagLine: 'T1', displayName: 'Gumayusi' },
      { gameName: 'Keria', tagLine: 'T1', displayName: 'Keria' },
    ].map((s, i) => ({ ...s, summonerId: i + 1, accountId: i + 1, puuid: '', profileIconId: 1, summonerLevel: 200 + i * 50 }));

    setSummonerList(mockSummoners);

    const mockProfiles: Record<string, any> = {};
    const tiers = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'PLATINUM'];
    const ranks = ['I', 'II', 'III', 'IV'];
    const champs = ['Ahri', 'Garen', 'Lee Sin', 'Jinx', 'Thresh'];

    mockSummoners.forEach((s, i) => {
      mockProfiles[`${s.gameName}#${s.tagLine}`] = {
        gameName: s.gameName,
        tagLine: s.tagLine,
        region: 'euw1',
        data: {
          rankedStats: [{
            queueType: 'RANKED_SOLO_5x5',
            tier: tiers[i] || 'GOLD',
            rank: ranks[i % 4],
            leaguePoints: Math.floor(Math.random() * 300),
            wins: 150 + i * 20,
            losses: 80 + i * 15,
          }],
          topChampions: [{ championId: 103 + i, championName: champs[i], masteryPoints: 500000 - i * 50000 }],
          opScore: (8.5 - i * 0.3).toFixed(1),
        }
      };
    });
    setNexusProfiles(mockProfiles);
  }, 1500);
}
