const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  togglePin: (pinned) => ipcRenderer.invoke('window:toggle-pin', pinned),

  // Nexus Sight data fetching
  fetchPlayer: (params) => ipcRenderer.invoke('nexus:fetch-player', params),
  fetchLive: (params) => ipcRenderer.invoke('nexus:fetch-live', params),

  // LCU event listeners
  onLcuStatus: (cb) => ipcRenderer.on('lcu:status', (_, d) => cb(d)),
  onLcuPhase: (cb) => ipcRenderer.on('lcu:phase', (_, d) => cb(d)),
  onChampSelect: (cb) => ipcRenderer.on('lcu:champ-select', (_, d) => cb(d)),
  onLiveGame: (cb) => ipcRenderer.on('lcu:live-game', (_, d) => cb(d)),
  onSummoner: (cb) => ipcRenderer.on('lcu:summoner', (_, d) => cb(d)),
  onSummonerList: (cb) => ipcRenderer.on('lcu:summoner-list', (_, d) => cb(d)),
  onNexusProfile: (cb) => ipcRenderer.on('nexus:profile', (_, d) => cb(d)),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
