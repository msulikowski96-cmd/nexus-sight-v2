import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Sword, Shield, Zap, Star } from 'lucide-react';

const ICONS = [Sword, Shield, Zap, Star, Shield];
const ITEM_NAMES = ['Trójząb Tryndamere', 'Zbroja Thornmail', 'Mrozopierścień', 'Krwawy Miecz', 'Pancerz Randuina'];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1900),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-7"
      initial={{ opacity: 0, scale: 0.85, rotateX: -15 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: 60, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-full text-center mb-7"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-display font-black leading-none uppercase" style={{ fontSize: '10cqw' }}>
          Kalkulator <span className="text-primary">Buildu</span>
        </h2>
        <p className="font-body text-white/50 mt-2" style={{ fontSize: '4cqw' }}>
          Optymalny build pod skład wroga
        </p>
      </motion.div>

      <motion.div
        className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-5"
        initial={{ opacity: 0, y: 40 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ type: 'spring', bounce: 0.35 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold uppercase text-white/40" style={{ fontSize: '3.5cqw' }}>Twój Bohater</div>
          <div className="bg-primary/20 border-2 border-primary rounded-xl flex items-center justify-center" style={{ width: '14cqw', height: '14cqw' }}>
            <Sword className="text-primary" style={{ width: '7cqw', height: '7cqw' }} />
          </div>
          <div className="font-display font-bold uppercase text-white/40" style={{ fontSize: '3.5cqw' }}>vs 5</div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {ICONS.map((Icon, i) => (
            <motion.div
              key={i}
              className="bg-white/10 border border-white/20 rounded-xl relative overflow-hidden flex flex-col items-center justify-center"
              style={{ aspectRatio: '1', padding: '3cqw' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ type: 'spring', delay: i * 0.12 }}
            >
              <Icon className="text-white/50" style={{ width: '7cqw', height: '7cqw' }} />
              <motion.div
                className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-12 translate-x-[-100%]"
                animate={phase >= 3 ? { translateX: ['-100%', '100%'] } : {}}
                transition={{ duration: 1.5, delay: i * 0.12 + 0.6, repeat: Infinity, repeatDelay: 4 }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="w-full flex flex-col gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {ITEM_NAMES.slice(0, 3).map((name, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: 0.5 + i * 0.12 }}
          >
            <div className="bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '9cqw', height: '9cqw' }}>
              {(() => { const Icon = ICONS[i]; return <Icon className="text-primary" style={{ width: '4.5cqw', height: '4.5cqw' }} />; })()}
            </div>
            <div className="font-body text-white/80" style={{ fontSize: '3.8cqw' }}>{name}</div>
            <div className="ml-auto font-display font-bold text-yellow-400" style={{ fontSize: '3.8cqw' }}>#{i + 1}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-7 text-center font-display font-bold tracking-[0.3em] uppercase text-white"
        style={{ fontSize: '7cqw' }}
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={phase >= 3 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
        transition={{ delay: 1.2 }}
      >
        NEXUS SIGHT
      </motion.div>
    </motion.div>
  );
}
