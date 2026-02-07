import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'delay' | 'error'>('verifying');
    const [readyToBegin, setReadyToBegin] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [retries, setRetries] = useState(0);
    
    const queryParams = new URLSearchParams(location.search);
    const reference = queryParams.get('reference') || queryParams.get('tx_ref');
    const paidSprintId = queryParams.get('sprintId');
    const queryEmail = queryParams.get('email'); // The exact email used during payment

    const [paymentEmail, setPaymentEmail] = useState<string | null>(queryEmail);

    useEffect(() => {
        if (!reference) {
            setStatus('error');
            return;
        }

        const checkStatus = async () => {
            try {
                const gateway = queryParams.get('reference') ? 'paystack' : 'flutterwave';
                const data = await paymentService.verifyPayment(gateway, reference);
                
                if (data.status === 'successful' || data.status === 'success') {
                    // Use verified email if returned, otherwise fallback to the query email
                    setPaymentEmail(data.email || queryEmail);
                    setStatus('success');
                    if (user) setReadyToBegin(true);
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
    }, [reference, retries, queryParams, user, queryEmail]);

    const handleAction = async () => {
        if (user) {
            setIsEnrolling(true);
            try {
                const targetId = paidSprintId || 'clarity-sprint';
                const sprint = await sprintService.getSprintById(targetId);
                const duration = sprint?.duration || 5;
                const enrollment = await sprintService.enrollUser(user.id, targetId, duration);
                navigate(`/participant/sprint/${enrollment.id}`);
            } catch (err) {
                console.error("Enrollment failed:", err);
                navigate('/dashboard');
            } finally {
                setIsEnrolling(false);
            }
        } else {
            // New user flow: Go to sign up with the EXACT prefilled email
            navigate('/signup', { 
                state: { 
                    prefilledEmail: paymentEmail,
                    fromPayment: true,
                    targetSprintId: paidSprintId || 'clarity-sprint'
                } 
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 font-sans selection:bg-primary/10">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 md:p-14 text-center relative overflow-hidden border border-gray-100 animate-slide-up">
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
                                <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-3 animate-pulse">Confirming Growth Access...</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="animate-fade-in space-y-10">
                            <div className="w-20 h-20 bg-primary text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            
                            <div className="space-y-8">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic leading-tight">
                                    Investment Secured. <br/>
                                    {user ? 'Registry active. Ready for Day 1.' : 'Secure your identity.'}
                                </h1>

                                <label className="flex items-center justify-center gap-4 p-5 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer active:scale-[0.98] transition-all hover:border-primary/20 group mx-auto max-w-[280px]">
                                    <input 
                                        type="checkbox" 
                                        checked={readyToBegin}
                                        onChange={(e) => setReadyToBegin(e.target.checked)}
                                        className="w-5 h-5 bg-white border-gray-200 rounded focus:ring-primary text-primary cursor-pointer transition-all"
                                    />
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest select-none">
                                        I’m ready to begin.
                                    </span>
                                </label>

                                <button 
                                    onClick={handleAction}
                                    disabled={!readyToBegin || isEnrolling}
                                    className={`w-full py-5 font-black uppercase tracking-[0.3em] text-[11px] rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                        readyToBegin 
                                        ? 'bg-primary text-white shadow-primary/30' 
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed border-none'
                                    }`}
                                >
                                    {isEnrolling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    {user ? 'Open Day 1 Now' : 'Establish Identity'}
                                </button>
                            </div>
                        </div>
                    )}

                    {(status === 'delay' || status === 'error') && (
                        <div className="space-y-6 py-4">
                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.75rem] flex items-center justify-center mx-auto">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">Sync Delayed</h1>
                                <p className="text-gray-500 font-medium text-xs mt-3 leading-relaxed px-4">Verification is taking longer than expected. Please go to your dashboard; the sprint will appear shortly.</p>
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