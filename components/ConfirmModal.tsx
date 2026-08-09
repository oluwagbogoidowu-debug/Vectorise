import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}) => {
  // Use a ref to track if we was open to handle exit animation text stability
  const lastActiveData = React.useRef<{title: string, message: string} | null>(null);
  
  if (isOpen) {
    lastActiveData.current = { title, message };
  }

  const displayTitle = isOpen ? title : lastActiveData.current?.title || title;
  const displayMessage = isOpen ? message : lastActiveData.current?.message || message;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-auto"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden border border-gray-100 z-[1001]"
          >
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-3xl mb-6 flex items-center justify-center ${
                variant === 'danger' ? 'bg-red-50 text-red-500' : 
                variant === 'success' ? 'bg-green-50 text-green-500' : 
                'bg-blue-50 text-blue-500'
              }`}>
                {variant === 'danger' ? <AlertCircle size={32} /> : 
                 variant === 'success' ? <CheckCircle2 size={32} /> : 
                 <AlertCircle size={32} />}
              </div>
              
              <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                {displayTitle}
              </h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                {displayMessage}
              </p>
            </div>
            
            <div className="p-8 pt-0 flex flex-col gap-3">
              <button
                onClick={() => {
                  console.log("[ConfirmModal] Confirm clicked");
                  onConfirm();
                  onClose();
                }}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] ${
                  variant === 'danger' ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600' :
                  variant === 'success' ? 'bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700' :
                  'bg-gray-900 text-white shadow-lg shadow-gray-200 hover:bg-black'
                }`}
              >
                {confirmText}
              </button>
              <button
                onClick={() => {
                  console.log("[ConfirmModal] Cancel clicked");
                  onClose();
                }}
                className="w-full py-4 rounded-2xl font-black text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
