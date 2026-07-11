import { Minus, X, Pin, PinOff, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Phase } from '../App';

interface Props {
  connected: boolean;
  phase: Phase;
  pinned: boolean;
  opacity: number;
  region: string;
  currentSummoner: any;
  onTogglePin: (p: boolean) => void;
  onOpacityChange: (v: number) => void;
  onRegionChange: (r: string) => void;
}

const PHASE_LABELS: Record<Phase, string> = {
  disconnected: 'Brak LoL',
  lobby: 'Lobby',
  'champ-select': 'Wybór Championów',
  'in-game': 'Gra na żywo',
  other: 'Menu',
};

const PHASE_COLORS: Record<Phase, string> = {
  disconnected: 'bg-slate-500/40 text-slate-300',
  lobby: 'bg-slate-600/40 text-slate-200',
  'champ-select': 'bg-blue-600/40 text-blue-200',
  'in-game': 'bg-green-600/40 text-green-200',
  other: 'bg-slate-600/40 text-slate-200',
};

const REGIONS = ['euw1', 'eune1', 'na1', 'kr', 'br1', 'tr1', 'ru'];

export function TitleBar({ connected, phase, pinned, opacity, region, currentSummoner, onTogglePin, onOpacityChange, onRegionChange }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="drag-region flex-shrink-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold text-xs">N</span>
          </div>
          <span className="font-display font-bold text-white tracking-wider text-sm uppercase">Nexus Sight</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-body font-medium ${PHASE_COLORS[phase]}`}>
            {PHASE_LABELS[phase]}
          </span>
        </div>

        <div className="no-drag flex items-center gap-1">
          <button
            onClick={() => setShowSettings(s => !s)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="Ustawienia"
          >
            <ChevronDown size={13} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => onTogglePin(!pinned)}
            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${pinned ? 'text-primary' : 'text-white/40 hover:text-white'}`}
            title={pinned ? 'Odepnij' : 'Przytnij na wierzch'}
          >
            {pinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="no-drag px-3 py-2 border-b border-white/8 bg-white/3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs font-body">Serwer:</span>
            <select
              value={region}
              onChange={e => onRegionChange(e.target.value)}
              className="bg-white/8 border border-white/10 rounded-lg text-white text-xs px-2 py-1 font-body focus:outline-none focus:border-primary"
            >
              {REGIONS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <span className="text-white/40 text-xs font-body whitespace-nowrap">Przezroczystość:</span>
            <input
              type="range"
              min={30}
              max={100}
              value={opacity}
              onChange={e => onOpacityChange(Number(e.target.value))}
              className="flex-1 h-1 accent-primary"
            />
            <span className="text-white/60 text-xs w-8">{opacity}%</span>
          </div>
        </div>
      )}

      {/* Summoner info bar */}
      {connected && currentSummoner && (
        <div className="px-3 py-1.5 border-b border-white/5 bg-white/2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-bold">{currentSummoner.gameName?.[0]}</span>
          </div>
          <span className="text-white/70 text-xs font-body">{currentSummoner.gameName}<span className="text-white/30">#{currentSummoner.tagLine}</span></span>
        </div>
      )}
    </div>
  );
}
