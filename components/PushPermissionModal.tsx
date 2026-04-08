import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Button from './Button';

interface PushPermissionModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onIgnore: () => void;
}

const PushPermissionModal: React.FC<PushPermissionModalProps> = ({ isOpen, onAccept, onDecline, onIgnore }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-3">
                Want reminders so you don’t lose momentum?
              </h3>
              <p className="text-gray-500 font-medium text-sm mb-8">
                Get reminded when your next task is ready and stay on track with your sprint goals.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={onAccept}
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Yes, Notify Me
                </Button>
                
                <div className="flex gap-3">
                  <button 
                    onClick={onDecline}
                    className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  >
                    No, Thanks
                  </button>
                  <button 
                    onClick={onIgnore}
                    className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PushPermissionModal;
