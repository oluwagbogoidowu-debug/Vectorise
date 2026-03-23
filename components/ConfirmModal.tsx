
import React from 'react';
import Button from './Button';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-scale-up">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <h3 className="text-xl font-black text-gray-900 tracking-tight italic mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed italic">{message}</p>
                </div>
                
                <div className="p-6 bg-gray-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 bg-white border border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all"
                    >
                        {cancelText}
                    </button>
                    <Button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
