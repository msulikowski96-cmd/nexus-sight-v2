import { motion } from 'framer-motion';
import { WifiOff, Coffee, Gamepad2 } from 'lucide-react';

interface Props {
  status: 'disconnected' | 'lobby' | 'other';
  currentSummoner?: any;
}

export function StatusScreen({ status, currentSummoner }: Props) {
  if (status === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <WifiOff className="text-white/30" size={28} />
        </motion.div>
        <div className="text-center">
          <h2 className="font-display font-bold text-white text-xl uppercase tracking-wide mb-1">Brak połączenia</h2>
          <p className="font-body text-white/40 text-sm leading-relaxed">
            Uruchom League of Legends.<br />Nakładka połączy się automatycznie.
          </p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/20"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Coffee className="text-primary" size={28} />
        </motion.div>
        <div className="text-center">
          <h2 className="font-display font-bold text-white text-xl uppercase tracking-wide mb-1">Lobby</h2>
          <p className="font-body text-white/40 text-sm leading-relaxed">
            Czekam na wybór championów…<br />Statystyki pojawią się automatycznie.
          </p>
        </div>
        {currentSummoner && (
          <div className="mt-2 text-center">
            <span className="text-white/30 text-xs font-body">Zalogowany jako </span>
            <span className="text-primary text-xs font-body font-medium">{currentSummoner.gameName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Gamepad2 className="text-white/30" size={28} />
      </div>
      <div className="text-center">
        <h2 className="font-display font-bold text-white text-xl uppercase tracking-wide mb-1">Menu główne</h2>
        <p className="font-body text-white/40 text-sm">Wejdź do kolejki lub lobby.</p>
      </div>
    </div>
  );
}
