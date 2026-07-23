import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'motion/react';
import { Flame, Coins, Clock, ArrowRight, Sparkles } from 'lucide-react';
import LocalLogo from '../../components/LocalLogo';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';

const DaySuccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve parameters from state or use sensible fallbacks
  const completedDay = location.state?.day || 1;
  const nextDay = completedDay + 1;
  const coinsUnlocked = location.state?.coinsUnlocked !== undefined ? location.state?.coinsUnlocked : 10;
  const bridgeNote = location.state?.bridgeNote;

  // Real-time local midnight countdown timer
  const [countdown, setCountdown] = useState('00:00:00');

  useEffect(() => {
    // Play satisfying success haptic feedback on entry
    triggerHaptic(hapticPatterns.success);

    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
      );
      const diff = midnight.getTime() - now.getTime();
      
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      } else {
        setCountdown('00:00:00');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const streakCount = (user as any)?.impactStats?.streak || 1;

  const handleStepUp = () => {
    triggerHaptic(hapticPatterns.light);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex justify-center items-center py-2">
        <LocalLogo type="green" className="h-7 w-auto text-[#0E7850]" />
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-md w-full mx-auto flex-1 flex flex-col justify-center items-center py-8">
        
        {/* Animated Celebration Icon */}
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-[#0E7850]/10 rounded-full animate-ping opacity-30 scale-125" />
          <div className="w-24 h-24 bg-[#0E7850] rounded-full flex items-center justify-center text-white shadow-xl relative">
            <Sparkles className="w-10 h-10 animate-pulse text-white" />
          </div>
        </motion.div>

        {/* Display Typography */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase leading-none">
            Day {completedDay} Complete!
          </h1>
          <p className="text-gray-500 font-medium text-xs uppercase tracking-widest mt-2">
            You've completed the day's sprint action step
          </p>
        </motion.div>

        {/* Info Cards Deck */}
        <div className="w-full space-y-4 mb-8">

          {/* Bridge Note Card */}
          {bridgeNote && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="w-full bg-purple-50/40 border border-purple-100/80 rounded-[2rem] p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest leading-none">
                    Bridge Note
                  </p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                    Your key to tomorrow
                  </p>
                </div>
              </div>
              <div className="text-left bg-white/70 border border-purple-50 p-4 rounded-2xl">
                <p className="text-xs text-gray-800 font-semibold italic leading-relaxed">
                  "{bridgeNote}"
                </p>
              </div>
            </motion.div>
          )}

          {/* Unlocked Coins Card (If coins unlocked > 0) */}
          {coinsUnlocked > 0 && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full bg-[#FFFBEB] border border-amber-200/60 rounded-[2rem] p-6 shadow-sm flex items-center gap-5 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl" />
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md relative shrink-0">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">
                  Unlocked Reward
                </p>
                <p className="text-xl font-black text-amber-950 tracking-tight mt-1">
                  +{coinsUnlocked} Rise Coins
                </p>
              </div>
            </motion.div>
          )}

          {/* Current Active Streak Card */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-[#0E7850]/5 rounded-full blur-2xl" />
            <div className="w-12 h-12 bg-[#0E7850] rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
              <Flame className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[10px] font-black text-[#0E7850] uppercase tracking-widest leading-none">
                Active Streak
              </p>
              <p className="text-xl font-black text-gray-900 tracking-tight mt-1">
                {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
              </p>
              <div className="h-[1px] w-full bg-gray-100 my-2" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Come back tomorrow: <span className="text-[#0E7850]">Day {nextDay}</span>
              </p>
            </div>
          </motion.div>

          {/* Next Day Timer Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5 relative overflow-hidden"
          >
            <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-500 shrink-0">
              <Clock className="w-5 h-5 text-[#0E7850]" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Next Day Unlock In
              </p>
              <p className="text-2xl font-mono font-black text-gray-900 tracking-tight mt-1">
                {countdown}
              </p>
            </div>
          </motion.div>

        </div>

      </main>

      {/* CTA Button Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto py-2">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={handleStepUp}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          Step up your rise
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </footer>
    </div>
  );
};

export default DaySuccessPage;
