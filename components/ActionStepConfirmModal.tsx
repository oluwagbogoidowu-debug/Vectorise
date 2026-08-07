import React from 'react';

interface ActionStepConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
}

export const ActionStepConfirmModal: React.FC<ActionStepConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Are you sure you did the action?",
  subtitle = "Be honest with yourself—taking real action is how you grow and get 1% better every day. Have you completed this action step?",
  confirmText = "Yes, I did the action",
  cancelText = "No, not yet"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100 transform transition-all animate-scale-up">
        {/* Warning / Confirmation Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center mx-auto mb-5 text-amber-600 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
          {title}
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-gray-500 leading-relaxed mb-6 font-medium">
          {subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionStepConfirmModal;
