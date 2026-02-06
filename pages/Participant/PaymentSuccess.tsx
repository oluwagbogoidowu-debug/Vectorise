
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'delay' | 'error'>('verifying');
    const [retries, setRetries] = useState(0);

    const query = new URLSearchParams(location.search);
    // Fixed: Support both 'reference' (Paystack) and 'tx_ref' (Flutterwave)
    const reference = query.get('reference') || query.get('tx_ref');

    useEffect(() => {
        if (!reference) {
            setStatus('error');
            return;
        }

        const checkStatus = async () => {
            try {
                // Fixed: Determine correct gateway for verification and fix missing method error
                const gateway = query.get('reference') ? 'paystack' : 'flutterwave';
                const data = await paymentService.verifyPayment(gateway, reference);
                
                if (data.status === 'successful' || data.status === 'success') {
                    setStatus('success');
                } else if (retries < 5) {
                    // Webhook might be slow, poll a few times
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
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 font-sans">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 md:p-14 text-center relative overflow-hidden border border-gray-100 animate-slide-up">
                
                {/* Brand Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-primary-hover"></div>
                
                <header className="mb-10">
                    <LocalLogo type="green" className="h-6 w-auto mx-auto mb-8 opacity-40" />
                    
                    {status === 'verifying' && (
                        <div className="space-y-6">
                            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto relative">
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-[2rem] animate-spin"></div>
                                <span className="text-3xl">🛡️</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic">Verifying Registry</h1>
                                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Connecting to Growth Protocol...</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic leading-none">Sprint Secured.</h1>
                                <p className="text-gray-500 font-medium text-sm mt-3 px-4">Your payment has been verified. Your path is now unlocked in the registry.</p>
                            </div>
                        </div>
                    )}

                    {(status === 'delay' || status === 'error') && (
                        <div className="space-y-6">
                            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto">
                                <span className="text-3xl">⏳</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic">Verification Pending</h1>
                                <p className="text-gray-500 font-medium text-xs mt-3">The transaction is taking a moment to sync. Your sprint will appear on your dashboard within 5 minutes.</p>
                            </div>
                        </div>
                    )}
                </header>

                <footer className="space-y-4 pt-4">
                    {status === 'success' ? (
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Enter Dashboard &rarr;
                        </button>
                    ) : (
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-5 bg-gray-100 text-gray-400 font-black uppercase tracking-[0.2em] text-[11px] rounded-full hover:bg-gray-200 transition-all"
                        >
                            Back to Dashboard
                        </button>
                    )}
                    
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">
                        Transaction ID: <span className="text-gray-400">{reference?.substring(0, 12)}...</span>
                    </p>
                </footer>

                {/* Aesthetic Detail */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
            
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;
