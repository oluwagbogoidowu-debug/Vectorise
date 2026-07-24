import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'motion/react';
import { Coins, Clock, ArrowRight, Sparkles, X } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';

const DaySuccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve parameters from state or use sensible fallbacks
  const completedDay = location.state?.day || 1;
  const coinsUnlocked = location.state?.coinsUnlocked !== undefined ? location.state?.coinsUnlocked : 10;
  const bridgeNote = location.state?.bridgeNote;

  // Real-time local midnight countdown timer
  const [countdown, setCountdown] = useState('00:00:00');

  useEffect(() => {
    // Play satisfying success haptic feedback on entry
    triggerHaptic(hapticPatterns.success);

    // Play completion sound on entry
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
      audio.play().catch((e) => console.error("Sound playback deferred/failed:", e));
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }

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

  const handleStepUp = () => {
    triggerHaptic(hapticPatterns.light);
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar with Cancel Button */}
      <div className="relative z-10 w-full max-w-md mx-auto flex justify-end items-center pt-2 pb-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-9 h-9 bg-gray-100 hover:bg-gray-200 border border-gray-200/80 rounded-full flex items-center justify-center text-gray-600 transition-colors cursor-pointer active:scale-95"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-md w-full mx-auto flex-1 flex flex-col justify-center items-center py-4">
        
        {/* Day X is complete badge & Bridge note headline */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full text-left mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#0E7850] rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-[#0E7850] uppercase tracking-wider">
              Day {completedDay} is complete!
            </h2>
          </div>

          {bridgeNote ? (
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mt-2">
              {bridgeNote}
            </p>
          ) : (
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mt-2">
              Great momentum today. Keep building your daily habit!
            </p>
          )}
        </motion.div>

        {/* Compact Info Cards Deck */}
        <div className="w-full space-y-3 mb-6">

          {/* Unlocked Coins Card (If coins unlocked > 0) */}
          {coinsUnlocked > 0 && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full bg-[#FFFBEB] border border-amber-200/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-amber-400/5 rounded-full blur-xl" />
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm relative shrink-0">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest leading-none">
                  Unlocked Reward
                </p>
                <p className="text-base font-black text-amber-950 tracking-tight mt-1">
                  +{coinsUnlocked} Rise Coins
                </p>
              </div>
            </motion.div>
          )}

          {/* Next Day Timer Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5 relative overflow-hidden"
          >
            <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 shrink-0">
              <Clock className="w-4 h-4 text-[#0E7850]" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Next Day Unlock In
              </p>
              <p className="text-lg font-mono font-black text-gray-900 tracking-tight mt-1">
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
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={handleStepUp}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Step up your rise</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </footer>
    </div>
  );
};

export default DaySuccessPage;
