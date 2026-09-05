import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, Sprint, Participant, ParticipantSprint, UserRole, LifecycleSlotAssignment } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { analyticsTracker } from '../../services/analyticsTracker';
import FormattedText from '../../components/FormattedText';
import BottomModalCoinCards from '../../components/BottomModalCoinCards';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';
import { toast } from 'sonner';
import { paymentService } from '../../services/paymentService';
import { LIFECYCLE_SLOTS } from '../../services/mockData';
import { getSprintCoverImage } from '../../utils/sprintUtils';

import { Calendar, Zap, CheckCircle2, Clock, ArrowRight, Share2, X } from 'lucide-react';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[10px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
      {children}
  </h2>
);

const SprintLandingPage: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const initialSprintState = useMemo(() => {
        if (location.state?.sprint && (location.state.sprint.id === sprintId || !sprintId)) {
            return location.state.sprint;
        }
        if (sprintId) {
            try {
                const local = localStorage.getItem(`vectorise_sprint_cache_${sprintId}`);
                if (local) return JSON.parse(local);
            } catch (e) {}
        }
        return null;
    }, [location.state, sprintId]);

    const [sprint, setSprint] = useState<Sprint | null>(initialSprintState);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(!initialSprintState);
    const [imageError, setImageError] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);

    const vectoriseCoach: Coach = {
        id: 'vectorise',
        name: 'Vectorise',
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
        role: UserRole.COACH,
        email: 'hello@vectorise.life',
        niche: 'AI Growth',
        bio: 'Your guide to the Vectorise platform.',
        approved: true
    };
    
    const fallbackImage = useMemo(() => getSprintCoverImage(sprint), [sprint]);
    const selectedFocus = location.state?.selectedFocus;

    const isOnboardingPath = useMemo(() => {
        return location.pathname.startsWith('/onboarding') || !!selectedFocus;
    }, [location.pathname, selectedFocus]);

    const activeTrigger = location.state?.trigger || 'after_homepage';
    const allMatchedSprintIds = location.state?.allMatchedSprintIds || [];

    const [orchestration, setOrchestration] = useState<Record<string, LifecycleSlotAssignment>>({});
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        if (!isOnboardingPath) return;

        const unsubOrchestration = sprintService.subscribeToOrchestration((mapping) => {
            const orchestrationMapping = mapping as Record<string, LifecycleSlotAssignment>;
            setOrchestration(orchestrationMapping);

            // REAL-TIME SYNC: If we have a focus and trigger, re-resolve the sprint
            if (selectedFocus && activeTrigger) {
                const slots = Object.entries(orchestrationMapping);
                let resolvedSprintId: string | null = null;
                let currentMatchedIds: string[] = [];
                
                // 1. Priority check within the triggering slot
                const triggerEntry = slots.find(([_, val]) => val.stateTrigger === activeTrigger);
                if (triggerEntry && triggerEntry[1].sprintFocusMap) {
                    const matches = Object.keys(triggerEntry[1].sprintFocusMap).filter(
                        sId => triggerEntry[1].sprintFocusMap?.[sId]?.includes(selectedFocus)
                    );
                    if (matches.length > 0) {
                        const priorities = triggerEntry[1].focusOptionPriorityMap?.[selectedFocus] || [];
                        if (priorities.length > 0) {
                            matches.sort((a, b) => {
                                const idxA = priorities.indexOf(a);
                                const idxB = priorities.indexOf(b);
                                if (idxA > -1 && idxB > -1) return idxA - idxB;
                                if (idxA > -1) return -1;
                                if (idxB > -1) return 1;
                                return 0;
                            });
                        }
                        resolvedSprintId = matches[0];
                        currentMatchedIds = matches;
                    }
                }
                
                // 2. Global registry check
                if (!resolvedSprintId) {
                    for (const [_, mapping] of slots) {
                        if (mapping.sprintFocusMap) {
                            const matches = Object.keys(mapping.sprintFocusMap).filter(
                                sId => mapping.sprintFocusMap?.[sId]?.includes(selectedFocus)
                            );
                            if (matches.length > 0) {
                                const priorities = mapping.focusOptionPriorityMap?.[selectedFocus] || [];
                                if (priorities.length > 0) {
                                    matches.sort((a, b) => {
                                        const idxA = priorities.indexOf(a);
                                        const idxB = priorities.indexOf(b);
                                        if (idxA > -1 && idxB > -1) return idxA - idxB;
                                        if (idxA > -1) return -1;
                                        if (idxB > -1) return 1;
                                        return 0;
                                    });
                                }
                                resolvedSprintId = matches[0];
                                currentMatchedIds = matches;
                                break;
                            }
                        }
                    }
                }
                
                if (resolvedSprintId && resolvedSprintId !== sprintId) {
                    // The orchestrator has changed the mapping for this focus!
                    const targetPath = location.pathname.startsWith('/onboarding') 
                        ? `/onboarding/description/${resolvedSprintId}`
                        : `/sprint/${resolvedSprintId}`;
                    navigate(targetPath, { 
                        state: { selectedFocus, trigger: activeTrigger, allMatchedSprintIds: currentMatchedIds },
                        replace: true 
                    });
                }
            }
        });

        return () => unsubOrchestration();
    }, [sprintId, isOnboardingPath, selectedFocus, activeTrigger, navigate, location.pathname]);

    const slotInfo = useMemo(() => {
        if (!sprintId || !orchestration || Object.keys(orchestration).length === 0) return null;
        const entry = Object.entries(orchestration).find(([_, assignment]) => 
            assignment.sprintId === sprintId || (assignment.sprintIds && assignment.sprintIds.includes(sprintId))
        );
        if (!entry) return null;
        const [slotId, assignment] = entry;
        
        const slotDef = LIFECYCLE_SLOTS.find(s => s.id === slotId);
        if (!slotDef) return null;

        const isFoundation = slotDef.stage === 'Foundation';
        
        return {
            slotId,
            name: slotDef.name.toUpperCase(),
            stage: isFoundation ? 'PHASE 01' : 'PHASE 02'
        };
    }, [sprintId, orchestration]);

    const handleSkipClarity = () => {
        navigate('/onboarding/focus-selector', { 
            state: { 
                trigger: 'skip_clarity',
                fromClaritySprintId: sprintId 
            } 
        });
    };

    const loadSprintData = useCallback(async () => {
        if (!sprintId) {
            setIsLoading(false);
            setFetchFailed(true);
            return;
        }

        if (!sprint) {
            setIsLoading(true);
        }
        setFetchFailed(false);

        try {
            let data = await sprintService.getSprintById(sprintId);
            
            if (!data) {
                console.log("[SprintLandingPage] Primary getSprintById returned null, searching admin/coach sprints fallback...");
                const adminSprints = await sprintService.getAdminSprints().catch(() => []);
                data = adminSprints.find(s => s.id === sprintId) || null;
            }

            if (data) {
                setSprint(data);
                setImageError(false);
                setFetchFailed(false);
                document.title = `${data.title} - Vectorise`;
                
                try {
                    if (data.coachId) {
                        const dbCoach = await userService.getUserDocument(data.coachId);
                        setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                    }
                } catch (e) {
                    setFetchedCoach(vectoriseCoach);
                }

                analyticsTracker.trackEvent('landing_viewed', { 
                    sprint_id: data.id, 
                    title: data.title,
                    category: data.category
                }, user?.id);
            } else {
                if (!sprint) setFetchFailed(true);
            }
        } catch (err) {
            console.error("Error fetching sprint landing data:", err);
            if (!sprint) setFetchFailed(true);
        } finally {
            setIsLoading(false);
        }
    }, [sprintId, sprint, user]);

    useEffect(() => {
        loadSprintData();

        if (!sprintId) return;

        const unsub = sprintService.subscribeToSprint(sprintId, (realtimeData) => {
            if (realtimeData) {
                setSprint(realtimeData);
                setIsLoading(false);
                setFetchFailed(false);
                if (realtimeData.coachId) {
                    userService.getUserDocument(realtimeData.coachId)
                        .then(dbCoach => setFetchedCoach((dbCoach as Coach) || vectoriseCoach))
                        .catch(() => setFetchedCoach(vectoriseCoach));
                }
            }
        });

        return () => unsub();
    }, [sprintId, user]);

    useEffect(() => {
        if (user) {
            sprintService.getUserEnrollments(user.id)
                .then(setUserEnrollments)
                .catch(e => console.error("Error fetching user enrollments:", e));
        }
    }, [user]);

    useEffect(() => {
        setImageError(false);
    }, [sprint?.coverImageUrl]);

    const hasCompletedOrActiveSprint = useMemo(() => {
        if (!user || !userEnrollments || userEnrollments.length === 0) return false;
        return userEnrollments.some(e => 
            e.status === 'completed' || 
            e.status === 'active' ||
            (e.progress && e.progress.length > 0 && e.progress.some(p => p.completed))
        );
    }, [user, userEnrollments]);

    const enrollmentStatus = useMemo(() => {
        if (!user || !sprint) return 'none';
        const enrollment = userEnrollments.find(e => e.sprint_id === sprint.id);
        if (enrollment) {
            return enrollment.status === 'active' ? 'active' : 'completed';
        }
        const p = user as Participant;
        if (p.savedSprintIds?.includes(sprint.id)) return 'queued';
        return 'none';
    }, [user, sprint, userEnrollments]);

    const activeEnrollmentId = useMemo(() => {
        if (!sprint) return null;
        return userEnrollments.find(e => e.sprint_id === sprint.id)?.id || null;
    }, [userEnrollments, sprint]);

    const [guestEmail, setGuestEmail] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');

    const [showCommitmentSheet, setShowCommitmentSheet] = useState(false);
    const [isCommitted, setIsCommitted] = useState(false);
    const [commitmentContext, setCommitmentContext] = useState<{ isGuest: boolean; emailExists?: boolean; guestEmail?: string } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('pkg_100');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Set default payment method when commitment sheet is shown
    useEffect(() => {
        if (showCommitmentSheet && sprint) {
            const userBalance = (user as Participant)?.walletBalance || 0;
            const neededCoins = sprint.pointCost || 10;
            if (userBalance >= neededCoins) {
                setPaymentMethod('coins');
            } else {
                setPaymentMethod('pkg_100');
            }
        }
    }, [showCommitmentSheet, user, sprint]);

    const isCoinSprint = useMemo(() => {
        if (!sprint) return true;
        if (sprint.pricingType === 'credits') return true;
        if (sprint.pricingType === 'cash') return false;
        if ((sprint.pointCost ?? 0) > 0 && !(sprint.price && sprint.price > 0)) return true;
        return (sprint.pointCost ?? 0) > 0;
    }, [sprint]);

    const isCashSprint = !isCoinSprint;

    const handleJoinClick = async () => {
        if (!sprint) return;

        analyticsTracker.trackEvent('sprint_intent_captured', { sprint_id: sprintId, onboarding: isOnboardingPath }, user?.id);

        // If user is logged in and not their first sprint, directly bring up the bottom modal bar for payment
        if (user && hasCompletedOrActiveSprint) {
            setCommitmentContext({ isGuest: false });
            setShowCommitmentSheet(true);
            return;
        }

        setIsCheckingEmail(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsCheckingEmail(false);

        navigate(`/sprint/preview/${sprint.id}`, {
            state: {
                sprint: sprint,
                prefilledEmail: user?.email || guestEmail,
                isOnboarding: isOnboardingPath,
                forcePreview: true
            }
        });
    };

    const handleConfirmCommitment = async () => {
        if (!isCommitted || !sprint || !commitmentContext) return;
        
        setIsProcessingPayment(true);
        // Minimum delay to show 'Unlocking Day 1...'
        await new Promise(resolve => setTimeout(resolve, 1200));

        try {
            if (commitmentContext.isGuest) {
                const effectiveEmail = commitmentContext.guestEmail || guestEmail;
                
                // If this is their first time (email doesn't exist in system), they get it for free!
                if (commitmentContext.emailExists === false) {
                    setShowCommitmentSheet(false);
                    toast.success("Day 1 unlocked! Create an account to continue.");
                    navigate('/signup', {
                        state: {
                            fromPayment: true,
                            targetSprintId: sprint.id,
                            prefilledEmail: effectiveEmail.toLowerCase().trim(),
                            authMessage: "This is your first sprint—it's completely free! Create an account to start."
                        },
                        replace: true
                    });
                    setIsProcessingPayment(false);
                    return;
                }

                // Existing guest (not first time) -> pay via card (Naira)
                const traceId = `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
                
                const neededCoins = sprint.pointCost || 10;
                const userBal = user ? ((user as Participant)?.walletBalance ?? 0) : 0;
                const coinsRem = Math.max(0, neededCoins - userBal);
                const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);

                const payload = {
                    userId: traceId,
                    email: effectiveEmail.toLowerCase().trim(),
                    sprintId: sprint.id,
                    amount: topupPrice,
                    currency: "NGN",
                    name: 'Vectorise Guest'
                };

                const checkoutUrl = await paymentService.initializeFlutterwave(payload);
                setShowCommitmentSheet(false);
                window.location.href = checkoutUrl;
            } else {
                // Logged in user
                if (!user) return;

                if (isCashSprint) {
                    const cashPrice = sprint.price ?? 1000;
                    if (cashPrice === 0) {
                        const enrollment = await sprintService.enrollUser(
                            user.id,
                            sprint.id,
                            sprint.duration,
                            {
                                coachId: sprint.coachId,
                                pricePaid: 0,
                                currency: sprint.currency || 'NGN',
                                source: 'cash'
                            }
                        );
                        toast.success("Sprint started successfully!");
                        setShowCommitmentSheet(false);
                        navigate(`/participant/sprint/${enrollment.id}`);
                        return;
                    } else {
                        const payload = {
                            userId: user.id,
                            email: user.email.toLowerCase().trim(),
                            sprintId: sprint.id,
                            trackId: sprint.trackId,
                            amount: cashPrice,
                            currency: sprint.currency || 'NGN',
                            name: user.name || 'Vectorise User'
                        };
                        const checkoutUrl = await paymentService.initializeFlutterwave(payload);
                        setShowCommitmentSheet(false);
                        window.location.href = checkoutUrl;
                        return;
                    }
                }

                if (paymentMethod === 'coins') {
                    const userBalance = (user as Participant).walletBalance || 0;
                    const neededCoins = sprint.pointCost || 10;
                    if (userBalance < neededCoins) {
                        toast.error(`Insufficient coins. Please select card payment or buy more coins.`);
                        setIsProcessingPayment(false);
                        return;
                    }

                    // Process wallet transaction
                    await userService.processWalletTransaction(user.id, {
                        amount: -neededCoins,
                        type: 'purchase',
                        description: `Unlocked ${sprint.title} via Credits`,
                        auditId: sprint.id
                    });

                    // Enroll user
                    const enrollment = await sprintService.enrollUser(
                        user.id, 
                        sprint.id, 
                        sprint.duration, 
                        {
                            coachId: sprint.coachId,
                            pricePaid: 0,
                            currency: sprint.currency || 'NGN',
                            source: 'coin'
                        }
                    );

                    toast.success("Sprint started successfully!");
                    setShowCommitmentSheet(false);
                    
                    // Navigate to the newly enrolled sprint
                    navigate(`/participant/sprint/${enrollment.id}`);
                } else if (paymentMethod === 'card') {
                    // Pay via Card (Naira)
                    const neededCoins = sprint.pointCost || 10;
                    const userBal = (user as Participant)?.walletBalance ?? 0;
                    const coinsRem = Math.max(0, neededCoins - userBal);
                    const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);

                    const payload = {
                        userId: user.id,
                        email: user.email.toLowerCase().trim(),
                        sprintId: sprint.id,
                        amount: topupPrice,
                        currency: "NGN",
                        name: user.name || 'Vectorise User'
                    };

                    const checkoutUrl = await paymentService.initializeFlutterwave(payload);
                    setShowCommitmentSheet(false);
                    window.location.href = checkoutUrl;
                } else {
                    // Pay via Coin Package selection (pkg_30, pkg_100, pkg_300)
                    const pkgMap: Record<string, { coins: number; price: number }> = {
                        pkg_30: { coins: 30, price: 500 },
                        pkg_100: { coins: 100, price: 1300 },
                        pkg_300: { coins: 300, price: 3600 }
                    };
                    const selectedPkg = pkgMap[paymentMethod];
                    if (!selectedPkg) {
                        toast.error("Invalid payment method selected.");
                        setIsProcessingPayment(false);
                        return;
                    }

                    const payload = {
                        userId: user.id,
                        email: user.email.toLowerCase().trim(),
                        name: user.name || 'Vectorise User',
                        amount: selectedPkg.price,
                        currency: "NGN",
                        coinPackageId: paymentMethod,
                        coins: selectedPkg.coins,
                        sprintId: sprint.id,
                        trackId: sprint.trackId
                    };

                    const checkoutUrl = await paymentService.initializeFlutterwave(payload);
                    setShowCommitmentSheet(false);
                    window.location.href = checkoutUrl;
                }
            }
        } catch (err: any) {
            console.error("Error starting day 1:", err);
            toast.error(err.message || "Failed to start day 1. Please try again.");
            setIsProcessingPayment(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 relative animate-pulse">
                <div className="max-w-screen-lg mx-auto px-4 pt-4">
                    {/* Header bar placeholder */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="h-4 w-28 bg-gray-200 rounded"></div>
                        <div className="flex gap-3">
                            <div className="h-8 w-20 bg-gray-200 rounded-xl"></div>
                            <div className="h-8 w-32 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main section placeholder */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Hero Image Skeleton */}
                            <div className="relative h-[280px] sm:h-[340px] lg:h-[440px] rounded-[3rem] bg-gray-200 border-4 border-white shadow-lg overflow-hidden">
                                <div className="absolute bottom-10 left-10 right-10 space-y-4">
                                    <div className="h-6 w-32 bg-gray-300 rounded-lg"></div>
                                    <div className="h-10 w-2/3 bg-gray-300 rounded-xl"></div>
                                    <div className="h-4 w-40 bg-gray-300 rounded-lg"></div>
                                </div>
                            </div>

                            {/* Sprint Overview Section Skeleton */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-gray-100 shadow-sm space-y-6">
                                <div className="h-5 w-40 bg-gray-200 rounded-lg"></div>
                                <div className="space-y-3">
                                    <div className="h-3.5 w-full bg-gray-200 rounded"></div>
                                    <div className="h-3.5 w-5/6 bg-gray-200 rounded"></div>
                                    <div className="h-3.5 w-4/5 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>

                        {/* Aside sidebar placeholder */}
                        <aside className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-gray-100 shadow-sm space-y-8">
                                <div className="space-y-4 flex flex-col items-center">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-8 w-40 bg-gray-200 rounded-xl"></div>
                                    <div className="h-4 w-20 bg-gray-100 rounded"></div>
                                </div>

                                <div className="h-px bg-gray-100 w-full"></div>

                                {/* Coach profile section skeleton */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <div className="h-3 w-20 bg-gray-100 rounded"></div>
                                            <div className="h-3 w-12 bg-gray-200 rounded"></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-12 w-full bg-gray-200 rounded-2xl"></div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        );
    }
    if (!sprint) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-6 py-12">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Zap className="w-6 h-6" />
                </div>
                <h2 className="text-base font-black mb-2 text-gray-900 tracking-tight">Registry item not found.</h2>
                <p className="text-xs text-gray-500 max-w-xs mb-6">
                    Unable to load sprint content. Check connection or retry fetching.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                    <Button onClick={loadSprintData} className="w-full text-xs">
                        Try Again
                    </Button>
                    <Button onClick={() => navigate('/explore')} variant="secondary" className="w-full text-xs">
                        Discover Paths
                    </Button>
                </div>
            </div>
        );
    }

    const isFoundational = sprint.sprintType === 'Foundational' || 
                           sprint.sprintType === 'Fundamentals' ||
                           sprint.sprintType === 'Core' ||
                           sprint.sprintType === 'Expert' ||
                           sprint.category === 'Core Platform Sprint' || 
                           sprint.category === 'Growth Fundamentals';

    const displayDescription = sprint.description || sprint.subtitle || "This sprint is designed to help you build a solid foundation for your growth journey.";
    const displayCoachName = isFoundational ? 'Vectorise' : (fetchedCoach?.name || 'Vectorise');
    const displayCoachImage = isFoundational ? 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd' : (fetchedCoach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE);

    const hasDynamicContent = Array.isArray(sprint.dynamicSections) && sprint.dynamicSections.some(s => s.body && s.body.trim().length > 0);

    const handleShare = () => {
        if (!sprint) return;
        const referee = user as any;
        const refSuffix = referee?.referralCode ? `?ref=${referee.referralCode}` : '';
        const shareUrl = `https://${window.location.host}/sprint/${sprint.id}${refSuffix}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => toast.success('Share link copied to clipboard!'))
            .catch(() => toast.error('Failed to copy link.'));
    };

    return (
        <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
            {/* NAVIGATION HEADER - Full Width */}
            {isOnboardingPath ? (
                <header className="bg-white border-b border-gray-100 py-4 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate('/onboarding/focus-selector', { state: { trigger: activeTrigger } })} 
                                className="group flex items-center text-gray-400 hover:text-primary transition-all text-[11px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Refine Focus
                            </button>
                            <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '25%' }}></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <LocalLogo type="green" className="h-7 w-auto" />
                        </div>
                    </div>
                </header>
            ) : (
                <header className="bg-white border-b border-gray-100 py-4 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-screen-lg mx-auto flex justify-between items-center">
                        {user ? (
                            <button 
                                onClick={() => navigate('/explore')} 
                                className="group flex items-center text-gray-400 hover:text-primary transition-all text-[11px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Registry
                            </button>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <LocalLogo type="green" className="h-8 w-auto" />
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleShare}
                                className="bg-white px-4 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-sm cursor-pointer"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                Share
                            </button>
                            <div className="px-4 py-1.5 rounded-xl border border-[#D3EBE3] bg-white text-[#159E6A] text-[11px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2">
                                <LocalLogo type="favicon" className="h-3 w-auto" />
                                VECTORISE
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* MODERN HERO HEADER SECTION WITH HORIZONTAL PADDING */}
            <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 max-w-screen-xl mx-auto">
                <div className="relative w-full h-[240px] sm:h-[285px] lg:h-[345px] bg-[#0c1310] rounded-[2rem] overflow-hidden shadow-xl">
                    <img 
                        src={imageError || !sprint.coverImageUrl ? fallbackImage : sprint.coverImageUrl} 
                        className="w-full h-full object-cover object-center scale-[1.01] filter brightness-[0.7] contrast-[1.02]" 
                        alt={sprint.title} 
                        onError={() => setImageError(true)}
                        referrerPolicy="no-referrer"
                    />
                    
                    {/* Visual Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1310] via-[#0c1310]/50 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c1310]/60 via-transparent to-[#0c1310]/40"></div>

                    {/* Content aligned inside a beautiful centered container */}
                    <div className="absolute inset-0 flex flex-col justify-end">
                        <div className="max-w-screen-lg w-full mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                            <div className="space-y-3 animate-fade-in max-w-2xl">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-white leading-[1.05] uppercase">
                                    <FormattedText text={sprint.title} inline />
                                </h1>
                                
                                {sprint.subtitle && (
                                    <p className="text-white/85 text-xs sm:text-sm md:text-base font-semibold tracking-tight leading-relaxed max-w-xl">
                                        {sprint.subtitle}
                                    </p>
                                )}

                                {/* Category & Sprint Type Badges */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md border border-white/20 text-white text-[8px] font-black uppercase tracking-[0.2em]">
                                        {sprint.category || 'Fundamentals'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] shadow-sm border border-primary/20">
                                        {sprint.sprintType || 'Evolution'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK INFO CARDS BELOW IMAGE */}
            <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-center">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Duration
                        </span>
                        <span className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tight">
                            {sprint.duration || 5} Move
                        </span>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-center">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Guided By
                        </span>
                        <span className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tight">
                            Vectorise
                        </span>
                    </div>
                </div>
            </div>

            {/* TWO-COLUMN CONTENT LAYOUT */}
            <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    <div className={enrollmentStatus === 'none' ? "lg:col-span-12 max-w-3xl mx-auto w-full" : "lg:col-span-8"}>
                        {/* MAIN CONTENT */}
                        <div className="space-y-8">
                            {(displayDescription || hasDynamicContent) && (
                                <section className="animate-fade-in py-2">
                                    <SectionHeading>Sprint Overview</SectionHeading>
                                    
                                    <div className="space-y-8 mt-6">
                                        {displayDescription && !hasDynamicContent && (
                                            <div className="text-base md:text-lg text-gray-600 font-medium leading-[1.6]">
                                                <FormattedText text={displayDescription} />
                                            </div>
                                        )}

                                        {Array.isArray(sprint.dynamicSections) && sprint.dynamicSections
                                            .filter(section => section.body && section.body.trim().length > 0)
                                            .map((section, index) => (
                                                <div key={index} className="animate-fade-in pt-6 first:pt-0 border-t first:border-0 border-gray-100">
                                                    {section.id !== 'overview' && <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">{section.title}</h3>}
                                                    <DynamicSectionRenderer section={section} />
                                                </div>
                                            ))
                                        }
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {enrollmentStatus !== 'none' && (
                        <aside className="lg:col-span-4">
                            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 relative lg:sticky lg:top-8 shadow-xs">
                                {/* Card displaying Action Trigger line or Rerun recommendations */}
                                <div className="relative z-10">
                                    {enrollmentStatus === 'active' ? (
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider mb-2">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                In Progress
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Sprint Active</h3>
                                            <Button 
                                                onClick={() => navigate(`/participant/sprint/${activeEnrollmentId}`)} 
                                                className="w-full py-4 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black bg-emerald-600 hover:bg-emerald-700 border-none group/btn cursor-pointer"
                                            >
                                                Back to Sprint 
                                                <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                            </Button>
                                        </div>
                                    ) : enrollmentStatus === 'queued' ? (
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider mb-2">
                                                <Clock className="w-3 h-3" />
                                                Enrolled
                                            </div>
                                            <Button 
                                                onClick={() => navigate('/my-sprints')} 
                                                className="w-full py-4 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black bg-blue-600 hover:bg-blue-700 border-none group/btn cursor-pointer"
                                            >
                                                View in My Sprints 
                                                <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            {/* Fixed Bottom CTA Bar for Viewport */}
            {enrollmentStatus === 'none' && !showCommitmentSheet && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.08)]">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{sprint.title}</p>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">GET 1% BETTER DAILY</p>
                        </div>
                        <Button 
                            onClick={handleJoinClick} 
                            disabled={isCheckingEmail}
                            className="py-3 px-5 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black bg-primary hover:bg-primary-hover text-white border-0 shrink-0 group/btn cursor-pointer"
                        >
                            {isCheckingEmail ? "Opening Move 1..." : "Begin Now"}
                            {!isCheckingEmail && <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* Commitment Bottom Sheet */}
            {showCommitmentSheet && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick"
                        onClick={() => setShowCommitmentSheet(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 z-[101] p-5 sm:p-6 overflow-y-auto max-h-[75vh] sm:max-h-[70vh] pb-6 animate-slide-up-quick relative">
                        {/* Close button */}
                        <button 
                            onClick={() => setShowCommitmentSheet(false)}
                            className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Drag Handle indicator */}
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>

                        {/* Sprint Title & Subtitle Header */}
                        <div className="text-left mb-4 pr-6">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200/60 mb-1.5">
                                <Zap className="w-3 h-3 text-[#0E7850]" />
                                <span className="text-[9px] font-black uppercase text-[#0E7850] tracking-wider">
                                    {isCashSprint ? "Cash Sprint" : "Coin Sprint"}
                                </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight">
                                {sprint.title}
                            </h3>
                            {(sprint.subtitle || sprint.description) && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                                    {sprint.subtitle || sprint.description}
                                </p>
                            )}
                        </div>
                        
                        {/* WALLET / PRICING SECTION - Only show if user is logged in */}
                        {user ? (
                            isCashSprint ? (
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4 space-y-3.5 text-left">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        <span>Sprint Program</span>
                                        <span className="text-gray-900">{sprint.duration || 7} Days</span>
                                    </div>
                                    <div className="h-[1px] bg-gray-200 w-full"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-600">Total Cost</span>
                                        <span className="text-base font-black text-[#0E7850]">
                                            {(sprint.price ?? 1000) === 0 ? 'FREE' : `₦${(sprint.price ?? 1000).toLocaleString()}`}
                                        </span>
                                    </div>

                                    {/* Commitment Radio Button */}
                                    <button 
                                        onClick={() => !isProcessingPayment && setIsCommitted(!isCommitted)}
                                        disabled={isProcessingPayment}
                                        className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border mt-3 text-left ${
                                            isCommitted 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            isCommitted ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                                        }`}>
                                            {isCommitted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-[11px] font-bold tracking-tight ${isCommitted ? 'text-gray-950' : 'text-gray-400'}`}>
                                            I commit to showing up and finishing this
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 mb-4 space-y-2.5 text-left">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        <span>Your Balance</span>
                                        <span className="text-gray-900">{(user as Participant)?.walletBalance ?? 0} COINS</span>
                                    </div>
                                    <div className="h-[1px] bg-gray-200 w-full"></div>
                                    <div className="space-y-2">
                                        {/* Option 1: Coins */}
                                        <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                            paymentMethod === 'coins' 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-white border-gray-150 text-gray-500'
                                        } ${((user as Participant)?.walletBalance ?? 0) < (sprint.pointCost || 10) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="radio" 
                                                    name="landing_payment_method" 
                                                    checked={paymentMethod === 'coins'} 
                                                    onChange={() => ((user as Participant)?.walletBalance ?? 0) >= (sprint.pointCost || 10) && setPaymentMethod('coins')}
                                                    disabled={((user as Participant)?.walletBalance ?? 0) < (sprint.pointCost || 10) || isProcessingPayment}
                                                    className="text-[#0E7850] focus:ring-[#0E7850] h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px] font-black uppercase text-gray-800">
                                                    Use {sprint.pointCost || 10} Coins
                                                </span>
                                            </div>
                                            {((user as Participant)?.walletBalance ?? 0) < (sprint.pointCost || 10) && (
                                                <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Insufficient</span>
                                            )}
                                        </label>
                                    </div>

                                    {/* Horizontal Coin Packages Cards inside bottom modal bar */}
                                    <BottomModalCoinCards 
                                        userBalance={(user as Participant)?.walletBalance ?? 0}
                                        sprintCost={sprint.pointCost || 10}
                                        sprintId={sprint.id}
                                        trackId={sprint.trackId}
                                        selectedPaymentMethod={paymentMethod}
                                        onSelectPaymentMethod={(method) => setPaymentMethod(method)}
                                        isProcessing={isProcessingPayment}
                                    />

                                    {/* Option 2: Card (Instant Topup - Subtle Styling) */}
                                    <div 
                                        onClick={() => !isProcessingPayment && setPaymentMethod('card')}
                                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                                            paymentMethod === 'card' 
                                            ? 'bg-gray-100/90 border-gray-300 text-gray-600' 
                                            : 'bg-gray-50/40 border-gray-200/50 text-gray-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="text-[10px] font-medium text-gray-400 leading-tight">Instant topup</span>
                                        {(() => {
                                            const neededCoins = sprint.pointCost || 10;
                                            const userBal = (user as Participant)?.walletBalance ?? 0;
                                            const coinsRem = Math.max(0, neededCoins - userBal);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);
                                            return (
                                                <span className="text-[10px] font-medium text-gray-400 shrink-0 ml-2">
                                                    {coinsRem > 0 ? `${coinsRem} Coin${coinsRem > 1 ? 's' : ''} (₦${topupPrice.toLocaleString()})` : `₦${topupPrice.toLocaleString()}`}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Commitment Radio Button (Moved Below Instant Topup) */}
                                    <button 
                                        onClick={() => !isProcessingPayment && setIsCommitted(!isCommitted)}
                                        disabled={isProcessingPayment}
                                        className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border mt-3 text-left ${
                                            isCommitted 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            isCommitted ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                                        }`}>
                                            {isCommitted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-[11px] font-bold tracking-tight ${isCommitted ? 'text-gray-950' : 'text-gray-400'}`}>
                                            I commit to showing up and finishing this
                                        </span>
                                    </button>
                                </div>
                            )
                        ) : (
                            // Guest Checkout Price display
                            commitmentContext?.emailExists !== false && (
                                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 mb-4 text-left space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-gray-400">Total Price</span>
                                        <span className="text-xs font-black text-gray-900">₦{(sprint.price || 1000).toLocaleString()}</span>
                                    </div>

                                    {/* Commitment Radio Button (For Guest) */}
                                    <button 
                                        onClick={() => !isProcessingPayment && setIsCommitted(!isCommitted)}
                                        disabled={isProcessingPayment}
                                        className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left ${
                                            isCommitted 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            isCommitted ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                                        }`}>
                                            {isCommitted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-[11px] font-bold tracking-tight ${isCommitted ? 'text-gray-950' : 'text-gray-400'}`}>
                                            I commit to showing up and finishing this
                                        </span>
                                    </button>
                                </div>
                            )
                        )}

                        {/* Start Day 1 Now / Continue button fixed to bottom of sheet */}
                        <div className="sticky bottom-0 bg-white pt-2 pb-1 border-t border-gray-100 z-10 mt-2">
                            <Button 
                                onClick={handleConfirmCommitment}
                                disabled={!isCommitted || isProcessingPayment}
                                className={`w-full py-4 rounded-2xl shadow-xl transition-all text-[10px] font-black tracking-[0.2em] uppercase border-none ${
                                    isCommitted && !isProcessingPayment
                                    ? 'bg-gray-900 text-white hover:scale-[1.01] active:scale-95 shadow-gray-900/15 cursor-pointer' 
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {isProcessingPayment ? "Unlocking Day 1..." : (
                                    commitmentContext?.isGuest && commitmentContext?.emailExists === false 
                                    ? "Start Day 1 Now" 
                                    : (
                                        isCashSprint && !commitmentContext?.isGuest
                                        ? (
                                            (sprint.price ?? 1000) === 0
                                                ? "Start Free Sprint"
                                                : `Payment for Package • ₦${(sprint.price ?? 1000).toLocaleString()}`
                                        )
                                        : paymentMethod === 'coins'
                                        ? `Start Day 1 Now • Use ${sprint.pointCost || 10} Coins`
                                        : paymentMethod === 'card'
                                        ? (() => {
                                            const neededCoins = sprint.pointCost || 10;
                                            const userBal = (user as Participant)?.walletBalance ?? 0;
                                            const coinsRem = Math.max(0, neededCoins - userBal);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);
                                            return `Start Day 1 Now • ₦${topupPrice.toLocaleString()}`;
                                        })()
                                        : paymentMethod === 'pkg_30'
                                        ? "Start Day 1 Now • Pay ₦500"
                                        : paymentMethod === 'pkg_100'
                                        ? "Start Day 1 Now • Pay ₦1,300"
                                        : paymentMethod === 'pkg_300'
                                        ? "Start Day 1 Now • Pay ₦3,600"
                                        : "Start Day 1 Now"
                                    )
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeInQuick {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUpQuick {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-fade-in-quick {
                    animation: fadeInQuick 0.2s ease-out forwards;
                }
                .animate-slide-up-quick {
                    animation: slideUpQuick 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;