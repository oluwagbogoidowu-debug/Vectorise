import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Button from './Button';

interface PushPermissionModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onIgnore: () => void;
  isLoading?: boolean;
}

const PushPermissionModal: React.FC<PushPermissionModalProps> = ({ isOpen, onAccept, onDecline, onIgnore, isLoading }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
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
                {window.self !== window.top && (
                  <span className="block mt-2 text-xs text-amber-600 font-bold">
                    Note: Notifications may be blocked in this preview. Please open the app in a new tab to enable them.
                  </span>
                )}
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Accept button clicked - triggering onAccept");
                    onAccept();
                  }}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Yes, Notify Me"}
                </button>
                
                <div className="flex gap-3">
                  <button 
                    onClick={onDecline}
                    disabled={isLoading}
                    className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    No, Thanks
                  </button>
                  <button 
                    onClick={onIgnore}
                    disabled={isLoading}
                    className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors disabled:opacity-50"
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
