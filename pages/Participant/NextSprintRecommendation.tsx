import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, X, Sparkles, Star, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';
import BottomModalCoinCards from '../../components/BottomModalCoinCards';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { paymentService } from '../../services/paymentService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach, UserRole, Participant, LifecycleSlotAssignment } from '../../types';
import { CATEGORY_TO_STAGE_MAP, FOCUS_OPTIONS } from '../../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import { toast } from 'sonner';

export const NextSprintRecommendation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateProfile } = useAuth();

    const { sprintId } = useParams();
    const completedSprintId = location.state?.completedSprintId;
    const initialSprint = location.state?.recommendedSprint || location.state?.sprint || null;

    const [sprint, setSprint] = useState<Sprint | null>(initialSprint);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(!initialSprint);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('coins');
    const [isCommitted, setIsCommitted] = useState<boolean>(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

    const vectoriseCoach: Coach = useMemo(() => ({
        id: 'vectorise',
        name: 'Vectorise',
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
        role: UserRole.COACH,
        email: 'hello@vectorise.life',
        niche: 'AI Growth',
        bio: 'Your guide to the Vectorise platform.',
        approved: true
    }), []);

    // Load next recommended sprint using Explore recommendation logic
    const loadNextSprint = useCallback(async () => {
        if (initialSprint) {
            setSprint(initialSprint);
            if (initialSprint.coachId) {
                try {
                    const dbCoach = await userService.getUserDocument(initialSprint.coachId);
                    setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                } catch (e) {
                    setFetchedCoach(vectoriseCoach);
                }
            } else {
                setFetchedCoach(vectoriseCoach);
            }
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [allPublished, dbCoaches, orchestration] = await Promise.all([
                sprintService.getPublishedSprints().catch(() => []),
                userService.getCoaches().catch(() => []),
                (sprintService.getOrchestration() as Promise<Record<string, LifecycleSlotAssignment>>).catch(() => ({} as Record<string, LifecycleSlotAssignment>))
            ]);
            
            if (sprintId) {
                const target = allPublished.find(s => s.id === sprintId) || await sprintService.getSprintById(sprintId);
                if (target) {
                    setSprint(target);
                    if (target.coachId) {
                        try {
                            const dbCoach = dbCoaches.find(c => c.id === target.coachId) || await userService.getUserDocument(target.coachId);
                            setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                        } catch (e) {
                            setFetchedCoach(vectoriseCoach);
                        }
                    } else {
                        setFetchedCoach(vectoriseCoach);
                    }
                    setIsLoading(false);
                    return;
                }
            }

            // Filter sprints based on target audience exactly like Explore page
            const allowedSprints = allPublished.filter(s => {
                if (user?.role === UserRole.ADMIN) {
                    return true;
                }
                
                if (!s.audience || s.audience.length === 0) {
                    return false;
                }

                const userAudiences: string[] = [];
                
                if (user?.role === UserRole.COACH || (user as any)?.persona === 'Coach') {
                    userAudiences.push('coach');
                    userAudiences.push('coaches');
                    
                    const sprintAudiences = s.audience.map((a: any) => String(a).toLowerCase().trim());
                    return sprintAudiences.some((sa: string) => 
                        userAudiences.some(ua => sa === ua || sa.includes(ua) || ua.includes(sa))
                    );
                }

                const pathway = String((user as any)?.risePathway || '').toLowerCase().trim();
                const persona = String((user as any)?.persona || '').toLowerCase().trim();
                const occupation = String((user as any)?.occupation || '').toLowerCase().trim();

                if (
                    pathway === 'student' || 
                    persona === 'student' || 
                    persona.includes('student') || 
                    persona.includes('graduate') || 
                    occupation === 'student' ||
                    occupation.includes('student')
                ) {
                    userAudiences.push('student');
                    userAudiences.push('students');
                    userAudiences.push('student/graduate');
                }

                if (
                    pathway === 'early_career' || 
                    pathway === 'growth_pro' || 
                    persona.includes('9-5') || 
                    persona.includes('professional') || 
                    occupation.includes('professional') || 
                    occupation.includes('employee') || 
                    occupation.includes('corporate')
                ) {
                    userAudiences.push('9-5 professional');
                    userAudiences.push('9-5 professionals');
                    userAudiences.push('professional');
                    userAudiences.push('professionals');
                    userAudiences.push('corporate professionals');
                }

                if (
                    pathway === 'builder' || 
                    persona.includes('entrepreneur') || 
                    persona.includes('owner') || 
                    persona.includes('founder') || 
                    occupation.includes('entrepreneur') || 
                    occupation.includes('business owner') || 
                    occupation.includes('founder')
                ) {
                    userAudiences.push('entrepreneur');
                    userAudiences.push('entrepreneurs');
                    userAudiences.push('business owner');
                    userAudiences.push('business owners');
                    userAudiences.push('founders / entrepreneurs');
                    userAudiences.push('founder');
                    userAudiences.push('builder');
                    userAudiences.push('builders');
                }

                if (
                    pathway === 'transition' || 
                    persona.includes('freelancer') || 
                    persona.includes('consultant') || 
                    persona.includes('creative') || 
                    persona.includes('hustler') || 
                    occupation.includes('freelancer') || 
                    occupation.includes('consultant') || 
                    occupation.includes('creative') || 
                    occupation.includes('hustler')
                ) {
                    userAudiences.push('freelancer/consultant');
                    userAudiences.push('creative/hustler');
                    userAudiences.push('freelancer');
                    userAudiences.push('consultant');
                    userAudiences.push('creative');
                    userAudiences.push('hustler');
                    userAudiences.push('freelancers');
                    userAudiences.push('consultants');
                    userAudiences.push('creatives');
                    userAudiences.push('hustlers');
                }

                const sprintAudiences = s.audience.map((a: any) => String(a).toLowerCase().trim());
                const isMatch = sprintAudiences.some((sa: string) => 
                    userAudiences.some(ua => sa === ua || sa.includes(ua) || ua.includes(sa))
                );

                const isCoachSprint = sprintAudiences.some(sa => sa === 'coach' || sa === 'coaches');
                if (isCoachSprint) {
                    return false;
                }

                return isMatch;
            });

            const candidatePool = allowedSprints.length > 0 ? allowedSprints : allPublished;

            let userEnrolledIds: string[] = [];
            if (user) {
                try {
                    const enrollments = await sprintService.getUserEnrollments(user.id);
                    userEnrolledIds = enrollments.map(e => e.sprint_id);
                } catch (e) {
                    console.error("Error fetching enrollments:", e);
                }
            }

            const enrolledSet = new Set(userEnrolledIds);
            const participant = user as Participant;
            let candidateSprint: Sprint | null = null;

            // Priority 1: User's queued / wishlist sprints
            const queuedIds = (participant?.savedSprintIds || []).filter(id => !enrolledSet.has(id));
            const wishlistIds = (participant?.wishlistSprintIds || []).filter(id => !enrolledSet.has(id));

            if (queuedIds.length > 0) {
                candidateSprint = candidatePool.find(s => s.id === queuedIds[0]) || null;
            }
            if (!candidateSprint && wishlistIds.length > 0) {
                candidateSprint = candidatePool.find(s => s.id === wishlistIds[0]) || null;
            }

            // Priority 2: Selected Growth Areas (Explore page logic)
            const growthAreas = participant?.growthAreas || [];
            if (!candidateSprint && growthAreas.length > 0) {
                const matchedGroups = GROWTH_AREAS.filter(g => 
                    g.options.some(opt => growthAreas.includes(opt))
                );
                if (matchedGroups.length > 0) {
                    const targetSprintTitles = matchedGroups.flatMap(g => g.sprints);
                    candidateSprint = candidatePool.find(s => 
                        targetSprintTitles.includes(s.title) && !enrolledSet.has(s.id)
                    ) || null;
                }
            }

            // Priority 3: Rise Pathway (Explore page logic)
            const pathwayId = participant?.risePathway;
            if (!candidateSprint && pathwayId) {
                const pathwaySprintMap: Record<string, string[]> = {
                    'student': ['Clarity Sprint', 'Direction Sprint'],
                    'early_career': ['Direction Sprint', 'Skill Sprint', 'Confidence Sprint'],
                    'growth_pro': ['Leadership Sprint', 'Visibility Sprint', 'Execution Sprint'],
                    'builder': ['Execution Sprint', 'Positioning Sprint', 'Focus Sprint'],
                    'transition': ['Clarity Sprint', 'Confidence Sprint', 'Consistency Sprint']
                };
                const targetTitles = pathwaySprintMap[pathwayId] || [];
                candidateSprint = candidatePool.find(s => 
                    targetTitles.includes(s.title) && !enrolledSet.has(s.id)
                ) || null;
            }

            // Priority 4: Onboarding Focus & Orchestration Slots (Explore page logic)
            const userFocus = (participant?.onboardingAnswers as any)?.selected_focus || 
                             Object.values(participant?.onboardingAnswers || {}).find(val => FOCUS_OPTIONS.includes(String(val)));

            if (!candidateSprint && userFocus && orchestration) {
                const prioritySlots = ['slot_found_clarity', 'slot_found_orient', 'slot_found_core'];
                for (const slotId of prioritySlots) {
                    const mapping = orchestration[slotId];
                    if (mapping) {
                        const focusMap = mapping.sprintFocusMap || {};
                        const matchedSprintId = Object.keys(focusMap).find(sId => focusMap[sId]?.includes(userFocus));
                        if (matchedSprintId) {
                            const found = candidatePool.find(s => s.id === matchedSprintId && !enrolledSet.has(s.id));
                            if (found) {
                                candidateSprint = found;
                                break;
                            }
                        }
                    }
                }
            }

            // Priority 5: Target Stage (Explore page logic)
            const targetStage = participant?.currentStage || 'Direction';
            if (!candidateSprint) {
                candidateSprint = candidatePool.find(s => 
                    CATEGORY_TO_STAGE_MAP[s.category] === targetStage && 
                    !enrolledSet.has(s.id)
                ) || null;
            }

            // Priority 6: Any non-enrolled published sprint (different from completed)
            if (!candidateSprint) {
                candidateSprint = candidatePool.find(s => s.id !== completedSprintId && !enrolledSet.has(s.id)) || null;
            }

            // Fallback: Any published sprint
            if (!candidateSprint && candidatePool.length > 0) {
                candidateSprint = candidatePool.find(s => s.id !== completedSprintId) || candidatePool[0];
            }

            if (candidateSprint) {
                setSprint(candidateSprint);
                if (candidateSprint.coachId) {
                    const matchedCoach = dbCoaches.find(c => c.id === candidateSprint?.coachId);
                    if (matchedCoach) {
                        setFetchedCoach(matchedCoach);
                    } else {
                        try {
                            const dbCoach = await userService.getUserDocument(candidateSprint.coachId);
                            setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                        } catch (e) {
                            setFetchedCoach(vectoriseCoach);
                        }
                    }
                } else {
                    setFetchedCoach(vectoriseCoach);
                }
            }
        } catch (err) {
            console.error("[NextSprintRecommendation] Error loading next sprint:", err);
        } finally {
            setIsLoading(false);
        }
    }, [initialSprint, sprintId, completedSprintId, user, vectoriseCoach]);

    useEffect(() => {
        loadNextSprint();
    }, [loadNextSprint]);

    // Update payment method default based on user balance
    useEffect(() => {
        if (sprint && user) {
            const cost = sprint.pointCost || 10;
            const balance = (user as Participant)?.walletBalance ?? 0;
            if (balance >= cost) {
                setPaymentMethod('coins');
            } else {
                setPaymentMethod('pkg_100');
            }
        }
    }, [sprint, user]);

    const handleConfirmCommitment = async () => {
        if (!user || !sprint || !isCommitted || isProcessingPayment) return;

        setIsProcessingPayment(true);
        const cost = sprint.pointCost || 10;
        const currentBalance = (user as Participant)?.walletBalance ?? 0;

        try {
            if (paymentMethod === 'coins') {
                if (currentBalance < cost) {
                    toast.error("Insufficient Growth Coins. Please select a package or instant top-up.");
                    setIsProcessingPayment(false);
                    return;
                }

                // Deduct coins via processWalletTransaction
                await userService.processWalletTransaction(user.id, {
                    amount: -cost,
                    type: 'purchase',
                    description: `Unlocked ${sprint.title} via Growth Coins`,
                    auditId: sprint.id
                });

                // Enroll in the sprint
                const enrollment = await sprintService.enrollUser(
                    user.id,
                    sprint.id,
                    sprint.duration || 7,
                    {
                        coachId: sprint.coachId,
                        pricePaid: 0,
                        currency: sprint.currency || 'NGN',
                        source: 'coin'
                    }
                );

                toast.success(`Unlocked ${sprint.title}! Let's start Day 1.`);
                setIsPaymentModalOpen(false);
                navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
            } else if (paymentMethod === 'card') {
                const coinsRem = Math.max(0, cost - currentBalance);
                const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);

                const checkoutUrl = await paymentService.initializeFlutterwave({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    amount: topupPrice,
                    currency: sprint.currency || 'NGN',
                    sprintId: sprint.id,
                    trackId: sprint.trackId
                });

                window.location.href = checkoutUrl;
            } else if (paymentMethod.startsWith('pkg_')) {
                const pkgPrices: Record<string, { price: number; coins: number }> = {
                    pkg_30: { price: 500, coins: 30 },
                    pkg_100: { price: 1300, coins: 100 },
                    pkg_300: { price: 3600, coins: 300 }
                };
                const selectedPkg = pkgPrices[paymentMethod] || { price: 1300, coins: 100 };

                const checkoutUrl = await paymentService.initializeFlutterwave({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    amount: selectedPkg.price,
                    currency: 'NGN',
                    coinPackageId: paymentMethod,
                    coins: selectedPkg.coins,
                    sprintId: sprint.id,
                    trackId: sprint.trackId
                });

                window.location.href = checkoutUrl;
            }
        } catch (err) {
            console.error("Failed to unlock sprint:", err);
            toast.error("Failed to unlock sprint. Please try again.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const userBalance = (user as Participant)?.walletBalance ?? 0;
    const sprintCost = sprint?.pointCost || 10;
    const sprintPrice = sprint?.price || 1000;

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-primary text-white relative overflow-hidden selection:bg-white/10">
            {/* Navigation Header */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-10 flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="p-1 -ml-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Back to Dashboard"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>Recommend Next Sprint</span>
                </div>
                <LocalLogo type="white" className="h-5 w-auto opacity-40" />
            </header>

            {/* Main Content */}
            <main className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-5 text-center">
                {/* Sprint Card with Price Badge visible */}
                <div className="w-full text-left">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                    ) : sprint ? (
                        <div className="space-y-3">
                            <SprintCard 
                                sprint={sprint} 
                                coach={fetchedCoach || vectoriseCoach} 
                                isStatic={true} 
                                hideFooterDetails={false}
                                variant="glass"
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-white/10 rounded-2xl border border-white/20">
                            <p className="text-xs font-bold text-white/80">No additional sprints found.</p>
                            <button
                                onClick={() => navigate('/explore')}
                                className="mt-4 px-4 py-2 bg-white text-primary text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                            >
                                Browse All Sprints
                            </button>
                        </div>
                    )}
                </div>

                {/* Continue CTA */}
                {sprint && (
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={isLoading || !sprint}
                        className="w-full py-5 bg-white text-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-4 opacity-20 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em]">GET 1% BETTER DAILY</p>
            </footer>

            <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Bottom Modal Bar for Payment */}
            <AnimatePresence>
                {isPaymentModalOpen && sprint && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-w-md w-full text-gray-900 relative shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)}
                                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="text-left mb-4">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 rounded-md border border-emerald-100 mb-1.5">
                                    <Sparkles className="w-3 h-3 text-[#0E7850]" />
                                    <span className="text-[9px] font-black uppercase text-[#0E7850] tracking-wider">
                                        Unlock Sprint
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-snug">
                                    {sprint.title}
                                </h3>
                            </div>

                            {/* Wallet / Pricing / Payment Options Section */}
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4 text-left space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    <span>Your Balance</span>
                                    <span className="text-gray-900 font-black">{userBalance} COINS</span>
                                </div>
                                <div className="h-[1px] bg-gray-200 w-full"></div>

                                <div className="space-y-2">
                                    {/* Option 1: Coins */}
                                    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                        paymentMethod === 'coins' 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                             : 'bg-white border-gray-150 text-gray-500'
                                    } ${userBalance < sprintCost ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                name="payment_method_choice" 
                                                checked={paymentMethod === 'coins'} 
                                                onChange={() => userBalance >= sprintCost && setPaymentMethod('coins')}
                                                disabled={userBalance < sprintCost || isProcessingPayment}
                                                className="text-[#0E7850] focus:ring-[#0E7850] h-4 w-4"
                                            />
                                            <span className="text-xs font-black uppercase text-gray-800">
                                                Use {sprintCost} Coins
                                            </span>
                                        </div>
                                        {userBalance < sprintCost && (
                                            <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">
                                                Insufficient
                                            </span>
                                        )}
                                    </label>
                                </div>

                                {/* Horizontal Coin Packages */}
                                <BottomModalCoinCards 
                                    userBalance={userBalance}
                                    sprintCost={sprintCost}
                                    sprintId={sprint.id}
                                    trackId={sprint.trackId}
                                    selectedPaymentMethod={paymentMethod}
                                    onSelectPaymentMethod={(method) => setPaymentMethod(method)}
                                    isProcessing={isProcessingPayment}
                                />

                                {/* Option 2: Instant Topup Card */}
                                <div 
                                    onClick={() => !isProcessingPayment && setPaymentMethod('card')}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                        paymentMethod === 'card' 
                                            ? 'bg-gray-100/90 border-gray-400 text-gray-800' 
                                            : 'bg-white border-gray-200/70 text-gray-400 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="text-[11px] font-bold text-gray-500">Instant card payment</span>
                                    {(() => {
                                        const coinsRem = Math.max(0, sprintCost - userBalance);
                                        const topupPrice = coinsRem > 0 ? coinsRem * 20 : sprintPrice;
                                        return (
                                            <span className="text-[11px] font-bold text-gray-600 shrink-0 ml-2">
                                                {coinsRem > 0 ? `${coinsRem} Coin${coinsRem > 1 ? 's' : ''} (₦${topupPrice.toLocaleString()})` : `₦${topupPrice.toLocaleString()}`}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {/* Commitment Checkbox */}
                                <button 
                                    onClick={() => !isProcessingPayment && setIsCommitted(!isCommitted)}
                                    disabled={isProcessingPayment}
                                    className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left cursor-pointer ${
                                        isCommitted 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                        isCommitted ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                                    }`}>
                                        {isCommitted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>
                                    <span className={`text-[11px] font-bold tracking-tight ${isCommitted ? 'text-gray-950' : 'text-gray-400'}`}>
                                        I commit to showing up and finishing this
                                    </span>
                                </button>
                            </div>

                            {/* Unlock Action Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleConfirmCommitment}
                                    disabled={!isCommitted || isProcessingPayment}
                                    className={`w-full py-4 rounded-2xl shadow-xl transition-all text-xs font-black tracking-[0.2em] uppercase border-none flex items-center justify-center gap-2 cursor-pointer ${
                                        isCommitted && !isProcessingPayment
                                            ? 'bg-[#0E7850] hover:bg-[#085C3D] text-white active:scale-95 shadow-[#0E7850]/20' 
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    {isProcessingPayment ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Unlocking Day 1...</span>
                                        </div>
                                    ) : paymentMethod === 'coins' ? (
                                        <span>Start Day 1 Now • Use {sprintCost} Coins</span>
                                    ) : paymentMethod === 'card' ? (
                                        (() => {
                                            const coinsRem = Math.max(0, sprintCost - userBalance);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : sprintPrice;
                                            return <span>Pay ₦{topupPrice.toLocaleString()} & Unlock</span>;
                                        })()
                                    ) : (
                                        <span>Purchase Package & Unlock</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NextSprintRecommendation;
