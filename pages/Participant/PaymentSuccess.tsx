
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import LocalLogo from '../../components/LocalLogo';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'delay' | 'error'>('verifying');
    const [readyToBegin, setReadyToBegin] = useState(false);
    const [retries, setRetries] = useState(0);

    const query = new URLSearchParams(location.search);
    const reference = query.get('reference') || query.get('tx_ref');

    useEffect(() => {
        if (!reference) {
            setStatus('error');
            return;
        }

        const checkStatus = async () => {
            try {
                const gateway = query.get('reference') ? 'paystack' : 'flutterwave';
                const data = await paymentService.verifyPayment(gateway, reference);
                
                if (data.status === 'successful' || data.status === 'success') {
                    setStatus('success');
                } else if (retries < 8) {
                    setTimeout(() => setRetries(prev => prev + 1), 2000);
                } else {
                    setStatus('delay');
                }
            } catch (err) {
                setStatus('error');
            }
        };

        checkStatus();
    }, [reference, retries, query]);

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 font-sans selection:bg-primary/10">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 md:p-14 text-center relative overflow-hidden border border-gray-100 animate-slide-up">
                
                {/* Brand Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-primary-hover"></div>
                
                <header className="mb-10">
                    <LocalLogo type="green" className="h-6 w-auto mx-auto mb-10 opacity-30" />
                    
                    {status === 'verifying' && (
                        <div className="space-y-8 py-4">
                            <div className="w-16 h-16 bg-primary/5 rounded-[1.75rem] flex items-center justify-center mx-auto relative">
                                <div className="absolute inset-0 border-[3px] border-primary border-t-transparent rounded-[1.75rem] animate-spin"></div>
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-[0.1em]">Verifying Registry</h1>
                                <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-3 animate-pulse">Syncing Growth Protocol...</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="animate-fade-in space-y-10">
                            <div className="w-20 h-20 bg-primary text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-primary/20 transition-transform hover:scale-105 duration-500">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            
                            <div className="space-y-8">
                                {/* Confirmation (1 line) */}
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic leading-tight">
                                    You’re in. Day 1 starts now.
                                </h1>

                                {/* Commitment (1 tap) */}
                                <label className="flex items-center justify-center gap-4 p-5 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer active:scale-[0.98] transition-all hover:border-primary/20 group mx-auto max-w-[280px]">
                                    <div className="relative flex items-center h-6 w-6">
                                        <input 
                                            type="checkbox" 
                                            checked={readyToBegin}
                                            onChange={(e) => setReadyToBegin(e.target.checked)}
                                            className="w-6 h-6 bg-white border-2 border-gray-200 rounded-lg focus:ring-offset-white focus:ring-primary text-primary cursor-pointer transition-all checked:bg-primary checked:border-primary"
                                        />
                                    </div>
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest select-none pt-0.5">
                                        I’m ready to begin.
                                    </span>
                                </label>

                                {/* Action (1 button) */}
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    disabled={!readyToBegin}
                                    className={`w-full py-5 font-black uppercase tracking-[0.3em] text-[11px] rounded-full shadow-2xl transition-all active:scale-95 ${
                                        readyToBegin 
                                        ? 'bg-primary text-white shadow-primary/30 hover:scale-[1.02]' 
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed border-none shadow-none grayscale'
                                    }`}
                                >
                                    Start Day 1
                                </button>
                            </div>
                        </div>
                    )}

                    {(status === 'delay' || status === 'error') && (
                        <div className="space-y-6 py-4">
                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.75rem] flex items-center justify-center mx-auto shadow-inner">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">Sync in Progress</h1>
                                <p className="text-gray-500 font-medium text-xs mt-3 leading-relaxed">The registry is taking a moment to authorize. Your sprint will appear on your dashboard within 5 minutes.</p>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full mt-8 py-5 bg-gray-100 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                <footer className="mt-4">
                    <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">
                        Transaction ID: {reference?.substring(0, 16).toUpperCase() || 'REGISTRY_SYNC_LOCAL'}
                    </p>
                </footer>

                {/* Aesthetic Detail */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
            </div>
            
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;
