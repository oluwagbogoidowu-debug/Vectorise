
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { userService, sanitizeData } from '../../services/userService';
import { Participant } from '../../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PaymentSuccess: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, updateProfile } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'delay' | 'error'>('verifying');
    const [readyToBegin, setReadyToBegin] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [retries, setRetries] = useState(0);
    
    const queryParams = new URLSearchParams(location.search);
    const reference = queryParams.get('reference') || queryParams.get('tx_ref');
    const paidSprintId = queryParams.get('sprintId');
    const rawEmail = queryParams.get('email'); 

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
                    setStatus('success');
                } else if (retries < 15) {
                    setTimeout(() => setRetries(prev => prev + 1), 3000);
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
    }, [reference, retries, status]);

    useEffect(() => {
        const performFulfillment = async () => {
            if (status !== 'success' || !paidSprintId || isEnrolling) return;
            
            setIsEnrolling(true);

            try {
                let targetUid = user?.id;
                
                // Only redirect to auth if not logged in
                if (!targetUid && rawEmail) {
                    const emailExists = await userService.checkEmailExists(rawEmail);
                    if (emailExists) {
                        navigate('/login', { state: { prefilledEmail: rawEmail, targetSprintId: paidSprintId, fromPayment: true } });
                        return;
                    } else {
                        navigate('/signup', { state: { prefilledEmail: rawEmail, targetSprintId: paidSprintId, fromPayment: true } });
                        return;
                    }
                }

                if (!targetUid) {
                    setStatus('error');
                    setIsEnrolling(false);
                    return;
                }

                const userRef = doc(db, 'users', targetUid);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) throw new Error("Registry identity not found.");
                
                const userData = sanitizeData(userSnap.data()) as Participant;
                const isFirstPaidSprint = !userData.partnerCommissionClosed;
                const sprint = await sprintService.getSprintById(paidSprintId);
                
                if (!sprint) throw new Error("Sprint metadata not found.");

                // ENRICHED ENROLLMENT CREATION WITH SNAKE_CASE FIELDS
                const enrollment = await sprintService.enrollUser(targetUid, paidSprintId, sprint.duration, {
                    coachId: sprint.coachId,
                    pricePaid: sprint.price || 0,
                    source: userData.referrerId ? 'influencer' : 'direct',
                    referral: userData.referrerId || null
                });

                const enrollmentRef = doc(db, 'enrollments', enrollment.id);

                if (userData.referrerId && isFirstPaidSprint && (sprint.price || 0) > 0) {
                    console.log("[Fulfillment] One-Time Partner Commission Triggered.");
                    await updateDoc(userRef, { partnerCommissionClosed: true });
                    await updateDoc(enrollmentRef, { isCommissionTrigger: true });
                    if (updateProfile) await updateProfile({ partnerCommissionClosed: true });
                }

                // TELEMETRY: Mark payment as successful in attempt history
                await paymentService.logPaymentAttempt({
                    user_id: targetUid,
                    sprint_id: paidSprintId,
                    amount: sprint.price || 0,
                    status: 'successful'
                });

                setReadyToBegin(true);
                setTimeout(() => navigate(`/participant/sprint/${enrollment.id}`, { replace: true }), 2500);

            } catch (err) {
                console.error("[Fulfillment] Critical Error:", err);
                setStatus('error');
            } finally {
                setIsEnrolling(false);
            }
        };

        performFulfillment();
    }, [status, user, paidSprintId, rawEmail, navigate, updateProfile]);

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
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">Securing Path</h1>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-3">Authorizing Registry Access...</p>
                            </div>
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-green-100">✓</div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none italic">Authorized.</h1>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-3">Your cycle is now active.</p>
                            </div>
                            {readyToBegin ? (
                                <div className="pt-6 animate-pulse"><p className="text-sm text-gray-500 font-medium italic">"Initializing dashboard..."</p></div>
                            ) : (
                                <div className="pt-6"><div className="w-12 h-1 bg-gray-100 rounded-full mx-auto overflow-hidden"><div className="h-full bg-primary rounded-full animate-progress-fast"></div></div></div>
                            )}
                        </div>
                    )}
                    {status === 'delay' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-orange-100">⏳</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Registry Overload</h1>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mt-4 italic">"Your payment was successful but the registry is still syncing. We'll automatically enroll you in a moment."</p>
                            </div>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-red-100">✕</div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Verification Failed</h1>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mt-4 italic">"We couldn't verify this transaction reference. If you were charged, please contact help@vectorise.com."</p>
                            </div>
                            <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all">Return to Dashboard</button>
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
