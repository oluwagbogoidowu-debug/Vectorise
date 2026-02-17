import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Participant } from '../../types';
import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading, updateProfile } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'delay' | 'error' | 'failed'>('verifying');
    const [errorNote, setErrorNote] = useState<string | null>(null);
    const [readyToBegin, setReadyToBegin] = useState(false);
    const [isFulfilling, setIsFulfilling] = useState(false);
    const [retries, setRetries] = useState(0);
    const fulfillmentAttempted = useRef(false);
    
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    
    // Flutterwave appends transaction_id to the redirect URL
    const reference = queryParams.get('reference') || queryParams.get('transaction_id');
    const paidSprintId = queryParams.get('sprintId');
    const rawEmail = queryParams.get('email'); 

    // 1. Verify Payment Status with Secure Backend
    useEffect(() => {
        if (!reference) {
            const flwStatus = queryParams.get('status');
            if (flwStatus === 'cancelled') {
                setStatus('failed');
                setErrorNote("Payment was cancelled by the user.");
            } else {
                setStatus('error');
                setErrorNote("No transaction reference found.");
            }
            return;
        }

        const checkStatus = async () => {
            try {
                const gateway = queryParams.get('reference') ? 'paystack' : 'flutterwave';
                const data = await paymentService.verifyPayment(gateway, reference, paidSprintId || undefined);
                
                if (data.status === 'successful' || data.status === 'success') {
                    setStatus('success');
                } else if (data.status === 'failed') {
                    setStatus('failed');
                    setErrorNote(data.message || "Payment not completed.");
                } else if (retries < 10) {
                    // Exponential-ish backoff to prevent UI lock while waiting for gateway sync
                    const delay = Math.min(5000, 1000 + (retries * 500));
                    setTimeout(() => setRetries(prev => prev + 1), delay);
                } else {
                    setStatus('delay');
                }
            } catch (err) {
                console.error("Verification error:", err);
                setStatus('error');
            }
        };

        if (status === 'verifying') {
            checkStatus();
        }
    }, [reference, retries, status, queryParams, paidSprintId]);

    // 2. Fulfillment Logic
    useEffect(() => {
        const performFulfillment = async () => {
            // Wait for auth to settle and payment to be verified
            if (loading || status !== 'success' || !paidSprintId || isFulfilling || fulfillmentAttempted.current) return;
            
            fulfillmentAttempted.current = true;
            setIsFulfilling(true);

            try {
                // CASE A: USER IS NOT LOGGED IN
                if (!user) {
                    if (rawEmail) {
                        console.log("[Fulfillment] Redirecting guest to identity establishment...");
                        const emailExists = await userService.checkEmailExists(rawEmail);
                        const targetPath = emailExists ? '/login' : '/signup';
                        navigate(targetPath, { 
                            state: { 
                                prefilledEmail: rawEmail, 
                                targetSprintId: paidSprintId, 
                                fromPayment: true 
                            },
                            replace: true
                        });
                        return;
                    } else {
                        // Fallback if no email in URL
                        navigate('/login', { state: { targetSprintId: paidSprintId }, replace: true });
                        return;
                    }
                }

                // CASE B: USER IS LOGGED IN
                console.log("[Fulfillment] Processing for logged-in user:", user.id);
                
                const userRef = doc(db, 'users', user.id);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) throw new Error("Registry identity not found.");
                
                const userData = userSnap.data() as Participant;
                const sprint = await sprintService.getSprintById(paidSprintId);
                if (!sprint) throw new Error("Sprint metadata not found.");

                // Check for existing active sprint
                const userEnrollments = await sprintService.getUserEnrollments(user.id);
                const hasActive = userEnrollments.some(e => e.status === 'active' && e.progress.some(p => !p.completed));

                if (hasActive) {
                    // Rule: One active sprint at a time. Add to Upcoming Queue.
                    console.log("[Fulfillment] Active sprint detected. Adding to queue.");
                    const currentQueue = userData.savedSprintIds || [];
                    
                    if (!currentQueue.includes(paidSprintId)) {
                        await updateDoc(userRef, {
                            savedSprintIds: arrayUnion(paidSprintId)
                        });
                        if (updateProfile) {
                            await updateProfile({ savedSprintIds: [...currentQueue, paidSprintId] });
                        }
                    }
                    
                    setReadyToBegin(true);
                    setTimeout(() => navigate('/my-sprints', { replace: true }), 2500);
                } else {
                    // No active sprint. Enroll and start Day 1.
                    console.log("[Fulfillment] No active sprint. Starting Day 1.");
                    const enrollment = await sprintService.enrollUser(user.id, paidSprintId, sprint.duration, {
                        coachId: sprint.coachId,
                        pricePaid: sprint.price || 0,
                        source: userData.referrerId ? 'influencer' : 'direct',
                        referral: userData.referrerId || null
                    });

                    // Handle Partner Commission logic
                    if (userData.referrerId && !userData.partnerCommissionClosed && (sprint.price || 0) > 0) {
                        const enrollmentRef = doc(db, 'enrollments', enrollment.id);
                        await updateDoc(userRef, { partnerCommissionClosed: true });
                        await updateDoc(enrollmentRef, { isCommissionTrigger: true });
                        if (updateProfile) await updateProfile({ partnerCommissionClosed: true });
                    }

                    setReadyToBegin(true);
                    setTimeout(() => navigate(`/participant/sprint/${enrollment.id}`, { replace: true }), 2500);
                }

                // Log Telemetry
                await paymentService.logPaymentAttempt({
                    user_id: user.id,
                    sprint_id: paidSprintId,
                    amount: sprint.price || 0,
                    status: 'successful'
                });

            } catch (err) {
                console.error("[Fulfillment] Critical Error:", err);
                setStatus('error');
            } finally {
                setIsFulfilling(false);
            }
        };

        performFulfillment();
    }, [status, user, loading, paidSprintId, rawEmail, navigate, updateProfile, isFulfilling]);

    // Cleanup reference in useMemo for React warning
    function useMemo(factory: () => URLSearchParams, deps: React.DependencyList): URLSearchParams {
        return React.useMemo(factory, deps);
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-12 relative overflow-hidden animate-fade-in">
                <header className="mb-10">
                    <LocalLogo type="green" className="h-10 w-auto mx-auto mb-6" />
                    
                    {status === 'verifying' && (
                        <div className="space-y-6">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-2xl">🔒</div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Validating Path</h1>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-3">Requesting Registry Clearance...</p>
                                {retries > 2 && (
                                    <p className="text-[10px] text-primary font-black uppercase mt-4 animate-pulse">Syncing with Gateway...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-green-100">✓</div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none italic">Authorized.</h1>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-3">Registry identity updated.</p>
                            </div>
                            {readyToBegin ? (
                                <div className="pt-6 animate-pulse">
                                    <p className="text-sm text-gray-500 font-medium italic">"Initializing your journey..."</p>
                                </div>
                            ) : (
                                <div className="pt-6">
                                    <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
                                        <div className="h-full bg-primary rounded-full animate-progress-fast"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'delay' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-orange-100">⏳</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Sync Delayed</h1>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mt-4 italic">"The payment was accepted, but the registry sync is taking longer than expected. We'll update your profile automatically."</p>
                            </div>
                            <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all">Go to Dashboard</button>
                        </div>
                    )}

                    {(status === 'error' || status === 'failed') && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-red-100">✕</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Authorization Error</h1>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mt-4 italic">
                                    {errorNote || "We couldn't verify this transaction reference. The sprint remains locked."}
                                </p>
                            </div>
                            <button onClick={() => navigate('/discover')} className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all">Return to Registry</button>
                        </div>
                    )}
                </header>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
            <style>{`
                @keyframes progressFast { 0% { width: 0%; transform: translateX(-100%); } 100% { width: 100%; transform: translateX(100%); } }
                .animate-progress-fast { animation: progressFast 1.5s ease-in-out infinite; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;
