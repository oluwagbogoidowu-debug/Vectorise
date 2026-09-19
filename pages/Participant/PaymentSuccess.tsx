import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';
import { trackService } from '../../services/trackService';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Track } from '../../types';
import { ArrowRight, Sparkles } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'successful' | 'failed' | 'pending' | 'cancelled'>('verifying');
    const [retryCount, setRetryCount] = useState(0);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [unlockedTrack, setUnlockedTrack] = useState<Track | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    const queryParams = useMemo(() => {
        const params = new URLSearchParams(location.search || window.location.hash.split('?')[1]);
        return {
            tx_ref: params.get('tx_ref') || params.get('transaction_id'),
            status: params.get('status')
        };
    }, [location]);

    const { tx_ref, status: urlStatus } = queryParams;

    const [coinsAdded, setCoinsAdded] = useState<number | null>(null);

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
                    setPaymentData(data);
                    if (data.coins) setCoinsAdded(data.coins);
                    clearInterval(pollInterval);
                    clearTimeout(timeoutFallback);
                    
                    // If this is a track payment, fetch track info and show dedicated success screen
                    if (data.trackId) {
                        try {
                            const t = await trackService.getTrackById(data.trackId);
                            if (t) setUnlockedTrack(t);
                        } catch (trackErr) {
                            console.error("Error loading track details:", trackErr);
                        }
                        // Do not auto-redirect; wait for user to click Continue
                        return;
                    }

                    // For non-track payments, execute standard redirect timer
                    setTimeout(async () => {
                        const finalUserId = user?.id || data.userId;
                        
                        // If they are logged in (not a guest), save the first action input to the enrollment doc in db!
                        const pendingRaw = localStorage.getItem('pending_first_action');
                        if (pendingRaw && data.sprintId && finalUserId && !finalUserId.startsWith('guest_')) {
                            try {
                                const pending = JSON.parse(pendingRaw);
                                if (pending && pending.sprintId === data.sprintId && pending.firstActionInput) {
                                    const enrollmentId = `enrollment_${finalUserId}_${data.sprintId}`;
                                    const enrollmentRef = doc(db, 'users', finalUserId, 'enrollments', enrollmentId);
                                    const enrollmentSnap = await getDoc(enrollmentRef);
                                    if (enrollmentSnap.exists()) {
                                        const enrollmentData = enrollmentSnap.data() as any;
                                        const updatedProgress = (enrollmentData.progress || []).map((p: any) => 
                                            p.day === 1 ? {
                                                ...p,
                                                answers: [pending.firstActionInput],
                                                submission: pending.firstActionInput
                                            } : p
                                        );
                                        await updateDoc(enrollmentRef, {
                                            progress: updatedProgress
                                        });
                                        console.log("[PaymentSuccess] Saved pending first action input directly to Firestore Day 1!");
                                    }
                                }
                            } catch (err) {
                                console.error("[PaymentSuccess] Error saving pending first action:", err);
                            }
                            localStorage.removeItem('pending_first_action');
                        }

                        if (data.coinPackageId) {
                            // Coin purchase flow
                            if (data.sprintId) {
                                navigate('/onboarding/sprint-payment', { 
                                    state: { 
                                        sprintId: data.sprintId
                                    },
                                    replace: true 
                                });
                            } else {
                                navigate('/participant/dashboard', { replace: true });
                            }
                            return;
                        }

                        if (!user && data.userId?.startsWith('guest_')) {
                            // Guest flow: Check if user exists by email
                            const existingUser = await userService.getUserByEmail(data.email || '');
                            
                            if (existingUser) {
                                navigate('/login', { 
                                    state: { 
                                        prefilledEmail: data.email || '',
                                        targetSprintId: data.sprintId,
                                        tx_ref: tx_ref,
                                        authMessage: "Payment successful! Please log in to your account to start your sprint."
                                    },
                                    replace: true 
                                });
                            } else {
                                navigate('/signup', { 
                                    state: { 
                                        fromPayment: true, 
                                        targetSprintId: data.sprintId,
                                        prefilledEmail: data.email || '',
                                        tx_ref: tx_ref
                                    },
                                    replace: true 
                                });
                            }
                        } else {
                            // Logged in flow: Redirect to sprint view or dashboard
                            const finalUserId = user?.id || data.userId;
                            if (data.activeEnrollmentId) {
                                navigate(`/participant/sprint/${data.activeEnrollmentId}`, { replace: true });
                            } else {
                                const enrollmentId = `enrollment_${finalUserId}_${data.sprintId}`;
                                navigate(`/participant/sprint/${enrollmentId}`, { replace: true });
                            }
                        }
                    }, 3000);
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

    const handleTrackContinue = async () => {
        setIsNavigating(true);
        const trackTargetId = paymentData?.trackId || unlockedTrack?.id;

        if (trackTargetId) {
            navigate(`/track-starter/${trackTargetId}`, { 
                state: { 
                    trackId: trackTargetId,
                    tx_ref: tx_ref
                }, 
                replace: true 
            });
        } else {
            navigate('/dashboard', { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-4 text-center font-sans overflow-hidden">
            <div className={`w-full ${status === 'successful' && (paymentData?.trackId || unlockedTrack) ? 'max-w-lg' : 'max-w-md'} bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-6 sm:p-8 md:p-10 relative overflow-hidden animate-fade-in`}>
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
                        paymentData?.trackId || unlockedTrack ? (
                            <div className="space-y-5 animate-slide-up text-left">
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-emerald-50 text-[#0E7850] rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner border border-emerald-100">
                                        🎉
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                                        You’ve unlocked the track 🎉
                                    </h1>
                                    <p className="text-xs sm:text-sm font-bold text-gray-500">
                                        You now have access to the full track.
                                    </p>
                                </div>

                                {/* Track card */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden">
                                    <div className="h-40 sm:h-48 relative overflow-hidden bg-gray-100">
                                        <img 
                                            src={unlockedTrack?.coverImageUrl || `https://picsum.photos/seed/${unlockedTrack?.id || 'track'}/1200/600`} 
                                            className="w-full h-full object-cover" 
                                            alt={unlockedTrack?.title || 'Track'} 
                                            onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/track/1200/600`; }} 
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                                        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
                                            <span className="px-2.5 py-1 bg-[#0E7850] text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-[#0E7850]/20">
                                                UNLOCKED
                                            </span>
                                            <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-gray-900 text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm">
                                                {unlockedTrack?.sprintIds?.length || 0} SPRINTS
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[#0E7850] text-[8px] font-black uppercase tracking-[0.2em]">
                                                Track Bundle
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
                                            {unlockedTrack?.title || 'Growth Track Bundle'}
                                        </h3>
                                        {unlockedTrack?.subtitle && (
                                            <p className="text-xs font-semibold text-gray-400 line-clamp-2">
                                                {unlockedTrack.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <hr className="border-gray-100 my-4" />

                                {/* Guidance question */}
                                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 text-center sm:text-left">
                                    <p className="text-xs sm:text-[13px] font-semibold text-gray-600 leading-relaxed">
                                        Before you start, we’d like to understand what matters most to you right now so we can guide you to the right place to begin.
                                    </p>
                                </div>

                                {/* Big continue button just like the button in next sprint page */}
                                <div className="pt-2">
                                    <button
                                        onClick={handleTrackContinue}
                                        disabled={isNavigating}
                                        className="w-full py-4.5 rounded-2xl shadow-xl transition-all text-sm sm:text-base font-black tracking-wider uppercase border-none flex items-center justify-center gap-2 cursor-pointer bg-[#0E7850] hover:bg-[#085C3D] text-white active:scale-95 shadow-[#0E7850]/20"
                                    >
                                        {isNavigating ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Starting Your Journey...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span>Continue</span>
                                                <ArrowRight className="w-5 h-5 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-slide-up">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-green-100">✓</div>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Success.</h1>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-2">Registry identity updated.</p>
                                </div>
                                {coinsAdded && (
                                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mt-4">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Wallet Updated</p>
                                        <p className="text-lg font-black text-gray-900">+{coinsAdded} Coins Added</p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 font-medium italic mt-4">"Authorizing your journey..."</p>
                            </div>
                        )
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