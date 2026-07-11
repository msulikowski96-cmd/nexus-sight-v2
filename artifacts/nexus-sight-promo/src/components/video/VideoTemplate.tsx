import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  home: 6000,
  profile: 7000,
  ai_analysis: 7000,
  live_game: 7000,
  build_calculator: 8000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020617] text-white">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-[120vw] h-[60vh] rounded-full blur-[80px] opacity-25"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)', top: '-10%', left: '-10%' }}
          animate={{ x: ['-5%', '15%', '0%'], y: ['0%', '10%', '5%'], scale: [1, 1.2, 0.95] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[100vw] h-[50vh] rounded-full blur-[80px] opacity-15"
          style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent)', bottom: '-10%', right: '-10%' }}
          animate={{ x: ['5%', '-10%', '0%'], y: ['5%', '-5%', '0%'], scale: [0.9, 1.1, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Noise overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.65\\" numOctaves=\\"3\\" stitchTiles=\\"stitch\\"%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\"/%3E%3C/svg%3E")' }} />

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Top logo bar */}
      <motion.div
        className="absolute top-10 left-0 right-0 z-20 flex justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="font-display font-bold text-2xl tracking-[0.3em] text-primary uppercase">
          NEXUS SIGHT
        </div>
      </motion.div>

      {/* Bottom URL */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 z-20 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <div className="font-body text-lg text-white/50 tracking-wider">
          nexus-sight.onrender.com
        </div>
      </motion.div>

      {/* Scene accent line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] z-10"
        style={{ background: 'var(--color-primary)', opacity: 0.4 }}
        animate={{ top: [`${15 + currentScene * 2}%`, `${17 + currentScene * 2}%`] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="home" />}
        {currentScene === 1 && <Scene2 key="profile" />}
        {currentScene === 2 && <Scene3 key="ai_analysis" />}
        {currentScene === 3 && <Scene4 key="live_game" />}
        {currentScene === 4 && <Scene5 key="build_calculator" />}
      </AnimatePresence>
    </div>
  );
}
