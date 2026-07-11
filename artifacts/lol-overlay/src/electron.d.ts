interface ElectronAPI {
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  togglePin: (pinned: boolean) => Promise<void>;
  fetchPlayer: (params: { gameName: string; tagLine: string; region: string }) => Promise<any>;
  fetchLive: (params: { gameName: string; tagLine: string; region: string }) => Promise<any>;
  onLcuStatus: (cb: (data: { connected: boolean }) => void) => void;
  onLcuPhase: (cb: (phase: string) => void) => void;
  onChampSelect: (cb: (session: any) => void) => void;
  onLiveGame: (cb: (data: any) => void) => void;
  onSummoner: (cb: (summoner: any) => void) => void;
  onSummonerList: (cb: (list: any[]) => void) => void;
  onNexusProfile: (cb: (profile: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
