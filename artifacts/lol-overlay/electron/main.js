const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const NEXUS_API = 'https://nexus-sight.onrender.com';

let mainWindow = null;
let tray = null;
let lcuState = { connected: false, port: null, password: null, protocol: null };
let pollInterval = null;

// ─────────────────────────────────────────────
// LCU (League Client Update) lockfile detection
// ─────────────────────────────────────────────
const LOCKFILE_PATHS = [
  'C:\\Riot Games\\League of Legends\\lockfile',
  path.join(process.env.LOCALAPPDATA || '', 'Riot Games', 'League of Legends', 'lockfile'),
  '/Applications/League of Legends.app/Contents/LoL/lockfile',
  path.join(process.env.HOME || '', 'Applications', 'League of Legends.app', 'Contents', 'LoL', 'lockfile'),
];

function findLockfile() {
  for (const p of LOCKFILE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseLockfile(content) {
  const parts = content.split(':');
  if (parts.length < 5) return null;
  return {
    name: parts[0],
    pid: parts[1],
    port: parts[2],
    password: parts[3],
    protocol: parts[4].trim(),
  };
}

// ─────────────────────────────────────────────
// HTTP helper for LCU API (self-signed cert)
// ─────────────────────────────────────────────
function lcuRequest(endpoint, port, password, protocol = 'https') {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${password}`).toString('base64');
    const options = {
      hostname: '127.0.0.1',
      port: parseInt(port),
      path: endpoint,
      method: 'GET',
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      rejectUnauthorized: false,
    };
    const req = (protocol === 'https' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ─────────────────────────────────────────────
// Nexus Sight API fetch
// ─────────────────────────────────────────────
function nexusFetch(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXUS_API + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ─────────────────────────────────────────────
// Main polling loop
// ─────────────────────────────────────────────
async function pollLCU() {
  const lockfilePath = findLockfile();

  if (!lockfilePath || !fs.existsSync(lockfilePath)) {
    if (lcuState.connected) {
      lcuState = { connected: false };
      sendToRenderer('lcu:status', { connected: false });
    }
    return;
  }

  try {
    const content = fs.readFileSync(lockfilePath, 'utf-8');
    const parsed = parseLockfile(content);
    if (!parsed) return;

    if (!lcuState.connected || lcuState.port !== parsed.port) {
      lcuState = { connected: true, ...parsed };
      sendToRenderer('lcu:status', { connected: true });
    }

    // Get current game phase
    const phase = await lcuRequest('/lol-gameflow/v1/gameflow-phase', parsed.port, parsed.password, parsed.protocol);
    sendToRenderer('lcu:phase', phase);

    if (phase === 'ChampSelect') {
      const session = await lcuRequest('/lol-champ-select/v1/session', parsed.port, parsed.password, parsed.protocol);
      if (session) {
        sendToRenderer('lcu:champ-select', session);
        // Fetch summoner names for all participants
        fetchChampSelectPlayers(session, parsed);
      }
    } else if (phase === 'InProgress') {
      // Use port 2999 for live game data
      try {
        const gameData = await lcuRequest('/allgamedata', 2999, null, 'https');
        if (gameData) sendToRenderer('lcu:live-game', gameData);
      } catch {}
    } else if (phase === 'Lobby') {
      sendToRenderer('lcu:lobby', null);
    }

  } catch (err) {
    // LCU not ready yet
  }
}

async function fetchChampSelectPlayers(session, lcuInfo) {
  try {
    const currentSummoner = await lcuRequest('/lol-summoner/v1/current-summoner', lcuInfo.port, lcuInfo.password, lcuInfo.protocol);
    if (!currentSummoner) return;

    sendToRenderer('lcu:summoner', currentSummoner);

    // Get all participants with summoner IDs
    const allIds = [
      ...(session.myTeam || []).map(p => p.summonerId),
      ...(session.theirTeam || []).map(p => p.summonerId),
    ].filter(id => id > 0);

    const summonerDetails = await Promise.all(
      allIds.map(id => lcuRequest(`/lol-summoner/v1/summoners/${id}`, lcuInfo.port, lcuInfo.password, lcuInfo.protocol).catch(() => null))
    );

    const validSummoners = summonerDetails.filter(Boolean);
    sendToRenderer('lcu:summoner-list', validSummoners);

    // Fetch Nexus Sight stats for each summoner (EUW default, can be changed)
    if (validSummoners.length > 0) {
      for (const s of validSummoners.slice(0, 10)) {
        if (s.gameName && s.tagLine) {
          fetchNexusStats(s.gameName, s.tagLine, 'euw1');
        }
      }
    }
  } catch (err) {}
}

async function fetchNexusStats(gameName, tagLine, region) {
  try {
    const profile = await nexusFetch(`/api/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    if (profile) {
      sendToRenderer('nexus:profile', { gameName, tagLine, region, data: profile });
    }
  } catch {}
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─────────────────────────────────────────────
// Window creation
// ─────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 760,
    x: width - 440,
    y: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5999');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Nexus Sight Overlay', enabled: false },
    { type: 'separator' },
    { label: 'Pokaż / ukryj', click: () => mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show() },
    { type: 'separator' },
    { label: 'Zamknij', click: () => app.quit() },
  ]);
  tray.setToolTip('Nexus Sight Overlay');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show());
}

// ─────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:close', () => mainWindow?.hide());
ipcMain.handle('window:toggle-pin', (_, pinned) => {
  mainWindow?.setAlwaysOnTop(pinned, 'screen-saver');
});
ipcMain.handle('nexus:fetch-player', async (_, { gameName, tagLine, region }) => {
  return await fetchNexusStats(gameName, tagLine, region);
});
ipcMain.handle('nexus:fetch-live', async (_, { gameName, tagLine, region }) => {
  try {
    return await nexusFetch(`/api/live-game/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  } catch { return null; }
});

// ─────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  pollInterval = setInterval(pollLCU, 3000);
  pollLCU();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  clearInterval(pollInterval);
});
