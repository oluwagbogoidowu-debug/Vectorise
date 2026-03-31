
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Participant } from '../types';
import { pushNotificationService } from '../services/pushNotificationService';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const DormancyPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && (user as Participant).notificationState === 'Dormant') {
      setShowPrompt(true);
    }
  }, [user]);

  const handleContinue = async () => {
    if (user) {
      await pushNotificationService.updateActivity(user.id, 'Active');
      setShowPrompt(false);
      navigate('/dashboard');
    }
  };

  const handleRestart = async () => {
    if (user) {
      // In a real app, you might reset progress or just navigate to the start
      await pushNotificationService.updateActivity(user.id, 'Active');
      setShowPrompt(false);
      navigate('/participant/discover');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Welcome back</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Want to restart fresh or continue where you stopped?
            </p>

            <div className="space-y-3">
              <button 
                onClick={handleContinue}
                className="w-full bg-primary text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Continue where I left
              </button>
              <button 
                onClick={handleRestart}
                className="w-full bg-gray-50 text-gray-900 py-4 rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all border border-gray-100"
              >
                Restart Fresh
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
