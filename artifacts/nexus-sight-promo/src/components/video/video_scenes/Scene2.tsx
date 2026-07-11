import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Trophy, Activity } from 'lucide-react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-7"
      initial={{ opacity: 0, y: 60, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -80, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-full mb-7"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-display font-black leading-none uppercase text-center" style={{ fontSize: '11cqw' }}>
          Profil <span className="text-primary">Gracza</span>
        </h2>
        <p className="font-body text-white/50 text-center mt-2" style={{ fontSize: '4cqw' }}>
          Rangi, KDA, historia meczy
        </p>
      </motion.div>

      <div className="flex gap-4 w-full mb-6">
        <motion.div
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Trophy className="text-yellow-400 mb-3" style={{ width: '7cqw', height: '7cqw' }} />
          <div className="font-body uppercase tracking-wider text-white/50" style={{ fontSize: '3.2cqw' }}>Solo/Duo</div>
          <div className="font-display font-bold text-white leading-tight" style={{ fontSize: '8cqw' }}>Master</div>
          <div className="text-primary font-body" style={{ fontSize: '4cqw' }}>240 LP</div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-yellow-400/20 blur-3xl rounded-full" />
        </motion.div>

        <motion.div
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <Activity className="text-primary mb-3" style={{ width: '7cqw', height: '7cqw' }} />
          <div className="font-body uppercase tracking-wider text-white/50" style={{ fontSize: '3.2cqw' }}>KDA Ratio</div>
          <div className="font-display font-bold text-white leading-tight" style={{ fontSize: '8cqw' }}>3.84</div>
          <div className="text-green-400 font-body" style={{ fontSize: '4cqw' }}>Wysokie</div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/20 blur-3xl rounded-full" />
        </motion.div>
      </div>

      <motion.div
        className="w-full flex flex-col gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        {[
          { res: 'Victory', kda: '12 / 2 / 8', champ: 'Ahri', score: 'S+' },
          { res: 'Victory', kda: '8 / 1 / 14', champ: 'Azir', score: 'S' },
          { res: 'Defeat', kda: '4 / 5 / 3', champ: 'Sylas', score: 'A-' },
        ].map((match, i) => (
          <motion.div
            key={i}
            className={`p-4 rounded-xl flex items-center justify-between border ${match.res === 'Victory' ? 'bg-primary/10 border-primary/30' : 'bg-red-500/10 border-red-500/30'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: i * 0.12 }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg flex items-center justify-center font-display font-bold flex-shrink-0" style={{ width: '11cqw', height: '11cqw', fontSize: '5cqw' }}>
                {match.champ[0]}
              </div>
              <div>
                <div className={`font-display font-bold ${match.res === 'Victory' ? 'text-primary' : 'text-red-400'}`} style={{ fontSize: '4.5cqw' }}>
                  {match.res}
                </div>
                <div className="font-body text-white/60" style={{ fontSize: '3.5cqw' }}>{match.champ}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold" style={{ fontSize: '4cqw' }}>{match.kda}</div>
              <div className="font-body text-yellow-400 font-bold" style={{ fontSize: '4cqw' }}>{match.score}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
