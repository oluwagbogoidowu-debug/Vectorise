import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'successful' | 'failed' | 'pending' | 'cancelled'>('verifying');
    const [retryCount, setRetryCount] = useState(0);

    const queryParams = useMemo(() => {
        const params = new URLSearchParams(location.search || window.location.hash.split('?')[1]);
        return {
            tx_ref: params.get('tx_ref') || params.get('transaction_id'),
            status: params.get('status')
        };
    }, [location]);

    const { tx_ref, status: urlStatus } = queryParams;

    useEffect(() => {
        // 1. Handle missing reference
        if (!tx_ref) {
            setStatus('failed');
            return;
        }

        // 2. Handle explicit cancellation from URL
        if (urlStatus === 'cancelled') {
            setStatus('cancelled');
            return;
        }

        // 3. Polling logic for successful or pending payments
        let pollInterval: any;
        let timeoutFallback: any;

        const checkStatus = async () => {
            try {
                const data = await paymentService.checkPaymentStatus(tx_ref);
                
                if (data.status === 'successful' || data.status === 'success') {
                    setStatus('successful');
                    clearInterval(pollInterval);
                    clearTimeout(timeoutFallback);
                    
                    // Redirect logic
                    setTimeout(() => {
                        if (!user && data.userId?.startsWith('guest_')) {
                            // Guest flow: Redirect to signup to establish identity
                            navigate('/signup', { 
                                state: { 
                                    fromPayment: true, 
                                    targetSprintId: data.sprintId,
                                    prefilledEmail: data.email || '',
                                    tx_ref: tx_ref
                                },
                                replace: true 
                            });
                        } else {
                            // Logged in flow: Redirect to sprint view or dashboard
                            const finalUserId = user?.id || data.userId;
                            const enrollmentId = `enrollment_${finalUserId}_${data.sprintId}`;
                            navigate(`/participant/sprint/${enrollmentId}`, { replace: true });
                        }
                    }, 2000);
                } else if (data.status === 'failed') {
                    setStatus('failed');
                    clearInterval(pollInterval);
                    clearTimeout(timeoutFallback);
                } else if (data.status === 'cancelled') {
                    setStatus('cancelled');
                    clearInterval(pollInterval);
                    clearTimeout(timeoutFallback);
                } else {
                    setStatus('pending');
                    setRetryCount(prev => {
                        const next = prev + 1;
                        // Max retries (20 * 3s = 60s)
                        if (next >= 20) {
                            clearInterval(pollInterval);
                            clearTimeout(timeoutFallback);
                            setStatus('failed');
                        }
                        return next;
                    });
                }
            } catch (err) {
                console.error("Status check failed:", err);
            }
        };

        // Start polling
        checkStatus();
        pollInterval = setInterval(checkStatus, 3000);

        // 4. Timeout fallback (60 seconds)
        timeoutFallback = setTimeout(() => {
            clearInterval(pollInterval);
            if (status === 'verifying' || status === 'pending') {
                setStatus('failed');
            }
        }, 60000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeoutFallback);
        };
    }, [tx_ref, urlStatus, navigate, user]);

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-4 text-center font-sans overflow-hidden">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 relative overflow-hidden animate-fade-in">
                <header className="mb-0">
                    <LocalLogo type="green" className="h-8 w-auto mx-auto mb-6" />
                    
                    {status === 'verifying' || status === 'pending' ? (
                        <div className="space-y-4">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 border-6 border-primary/5 rounded-full"></div>
                                <div className="absolute inset-0 border-6 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🔒</div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none italic">Validating Authorization</h1>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-3">
                                    Checking Registry source of truth...
                                </p>
                                
                                {retryCount > 10 && (
                                    <div className="mt-6 animate-fade-in">
                                        <p className="text-[9px] text-gray-400 font-bold italic mb-3">
                                            Verification is taking longer...
                                        </p>
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                                        >
                                            Force Refresh
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : status === 'successful' ? (
                        <div className="space-y-4 animate-slide-up">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-green-100">✓</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Success.</h1>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-2">Registry identity updated.</p>
                            </div>
                            <p className="text-xs text-gray-500 font-medium italic mt-4">"Authorizing your journey..."</p>
                        </div>
                    ) : status === 'cancelled' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-amber-100">!</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none italic">Cancelled</h1>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-3 italic">
                                    Your payment was cancelled. No charges were made.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate('/onboarding/focus-selector', { replace: true })} 
                                className="w-full py-3.5 bg-gray-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl active:scale-95 transition-all"
                            >
                                Return to Registry
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-red-100">✕</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none italic">Failed</h1>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-3 italic">
                                    Your payment could not be verified.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate('/onboarding/focus-selector', { replace: true })} 
                                className="w-full py-3.5 bg-gray-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl active:scale-95 transition-all"
                            >
                                Return to Registry
                            </button>
                        </div>
                    )}
                </header>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;