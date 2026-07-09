import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, Sprint, Participant, ParticipantSprint, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { analyticsTracker } from '../../services/analyticsTracker';
import FormattedText from '../../components/FormattedText';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';
import LocalLogo from '../../components/LocalLogo';
import { toast } from 'sonner';
import { paymentService } from '../../services/paymentService';

import { Calendar, Zap, CheckCircle2, Clock, ArrowRight, Share2 } from 'lucide-react';

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
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

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
    
    const fallbackImage = assetService.URLS.DEFAULT_SPRINT_COVER;
    const selectedFocus = location.state?.selectedFocus;

    useEffect(() => {
        const fetchData = async () => {
            if (!sprintId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
                setImageError(false);
                
                if (data) {
                    document.title = `${data.title} - Vectorise`;
                    const dbCoach = await userService.getUserDocument(data.coachId);
                    setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                    
                    // Analytics: Track view
                    analyticsTracker.trackEvent('landing_viewed', { 
                        sprint_id: sprintId, 
                        title: data.title,
                        category: data.category
                    }, user?.id);
                }

                if (user) {
                    const enrollments = await sprintService.getUserEnrollments(user.id);
                    setUserEnrollments(enrollments);
                }
            } catch (err) {
                console.error("Error fetching sprint landing data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [sprintId, user]);

    useEffect(() => {
        setImageError(false);
    }, [sprint?.coverImageUrl]);

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
    const [paymentMethod, setPaymentMethod] = useState<'coins' | 'card'>('coins');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Set default payment method when commitment sheet is shown
    useEffect(() => {
        if (showCommitmentSheet && sprint) {
            const userBalance = (user as Participant)?.walletBalance || 0;
            const neededCoins = sprint.pointCost || 10;
            if (userBalance >= neededCoins) {
                setPaymentMethod('coins');
            } else {
                setPaymentMethod('card');
            }
        }
    }, [showCommitmentSheet, user, sprint]);

    const handleJoinClick = async () => {
        if (!sprint) return;
        
        if (!user) {
            // Navigate directly to sprint preview page without any email requirement
            navigate(`/sprint/preview/${sprint.id}`, { state: { sprintId: sprint.id, sprint: sprint } });
            return;
        }

        analyticsTracker.trackEvent('sprint_intent_captured', { sprint_id: sprintId }, user?.id);
        setCommitmentContext({
            isGuest: false
        });
        setIsCommitted(false);
        setShowCommitmentSheet(true);
    };

    const handleConfirmCommitment = async () => {
        if (!isCommitted || !sprint || !commitmentContext) return;
        
        setIsProcessingPayment(true);
        try {
            if (commitmentContext.isGuest) {
                const effectiveEmail = commitmentContext.guestEmail || guestEmail;
                
                // If this is their first time (email doesn't exist in system), they get it for free!
                if (commitmentContext.emailExists === false) {
                    setShowCommitmentSheet(false);
                    toast.success("Congratulations! Your first sprint is completely free!");
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
                
                const payload = {
                    userId: traceId,
                    email: effectiveEmail.toLowerCase().trim(),
                    sprintId: sprint.id,
                    amount: sprint.price || 1000,
                    currency: "NGN",
                    name: 'Vectorise Guest'
                };

                const checkoutUrl = await paymentService.initializeFlutterwave(payload);
                setShowCommitmentSheet(false);
                window.location.href = checkoutUrl;
            } else {
                // Logged in user
                if (!user) return;
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
                } else {
                    // Pay via Card (Naira)
                    const payload = {
                        userId: user.id,
                        email: user.email.toLowerCase().trim(),
                        sprintId: sprint.id,
                        amount: sprint.price || 1000,
                        currency: "NGN",
                        name: user.name || 'Vectorise User'
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
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-base font-black mb-2">Registry item not found.</h2><Button onClick={() => navigate('/explore')}>Discover Paths</Button></div>;

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
                        <LocalLogo type="green" className="h-8 w-auto" />
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
                            {isFoundational ? 'FOUNDATIONAL PATH' : 'FOUNDATION PATH'}
                        </div>
                    </div>
                </div>
            </header>

            {/* MODERN FULL-WIDTH HERO HEADER SECTION */}
            <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[460px] bg-[#0c1310] overflow-hidden">
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
                    <div className="max-w-screen-lg w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12">
                        <div className="space-y-4 animate-fade-in max-w-2xl">
                            <div>
                                <span className="px-3 py-1 bg-[#0E7850] text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg inline-flex items-center gap-1.5 border border-[#159E6A]/20">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    {isFoundational ? 'FOUNDATIONAL PATH' : 'PREMIUM SPRINT'}
                                </span>
                            </div>
                            
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white leading-[1.05] uppercase">
                                <FormattedText text={sprint.title} inline />
                            </h1>
                            
                            {sprint.subtitle && (
                                <p className="text-white/85 text-sm sm:text-base md:text-lg font-semibold tracking-tight leading-relaxed max-w-xl">
                                    {sprint.subtitle}
                                </p>
                            )}
                            
                            <div className="pt-2 flex items-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">
                                <Clock className="w-3.5 h-3.5 text-[#159E6A]" />
                                <span>{sprint.duration} DAY JOURNEY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TWO-COLUMN CONTENT LAYOUT */}
            <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    <div className="lg:col-span-8">
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

                    <aside className="lg:col-span-4">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 relative lg:sticky lg:top-8">
                            {/* Simple Card Design - Clean flat layout without decorative blobs or top gradients */}
                            <div className="relative z-10">
                                {enrollmentStatus === 'none' ? (
                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                                            Start Your <span className="text-primary italic">Rise</span>
                                        </h3>
                                        <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                                            Start by seeing how you actually spend your time.
                                        </p>
                                    </div>
                                ) : enrollmentStatus === 'active' ? (
                                    <div className="mb-6">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider mb-2">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            In Progress
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Sprint Active</h3>
                                        <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                                            Continue your current sprint to build momentum.
                                        </p>
                                    </div>
                                ) : enrollmentStatus === 'queued' ? (
                                    <div className="mb-6">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider mb-2">
                                            <Clock className="w-3 h-3" />
                                            Enrolled
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">In Upcoming Queue</h3>
                                        <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                                            You are enrolled and ready to begin soon.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-400 border border-gray-100 text-[10px] font-black uppercase tracking-wider mb-2">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Completed
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Sprint Mastered</h3>
                                        <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                                            You have successfully completed this sprint!
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {enrollmentStatus === 'none' ? (
                                        <Button 
                                            onClick={handleJoinClick} 
                                            isLoading={isCheckingEmail}
                                            className="w-full py-4 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black group/btn border-0"
                                        >
                                            Begin Day 1 
                                            <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </Button>
                                    ) : enrollmentStatus === 'active' ? (
                                        <Button 
                                            onClick={() => navigate(`/participant/sprint/${activeEnrollmentId}`)} 
                                            className="w-full py-4 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black bg-emerald-600 hover:bg-emerald-700 border-none group/btn"
                                        >
                                            Back to Sprint 
                                            <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => navigate('/my-sprints')} 
                                            className="w-full py-4 rounded-xl shadow-sm text-[10px] uppercase tracking-widest font-black bg-blue-600 hover:bg-blue-700 border-none group/btn"
                                        >
                                            View in My Sprints 
                                            <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </Button>
                                    )}
                                </div>

                                {/* COACH SECTION */}
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={displayCoachImage} 
                                            alt="" 
                                            className="w-10 h-10 rounded-xl object-cover border border-gray-100" 
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Guided By</p>
                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">
                                                {displayCoachName}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Commitment Bottom Sheet */}
            {showCommitmentSheet && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick"
                        onClick={() => setShowCommitmentSheet(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 z-[101] p-5 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[55vh] pb-6 animate-slide-up-quick">
                        {/* Drag Handle indicator */}
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
                        
                        {/* Stay in your rise header */}
                        <h3 className="text-lg sm:text-xl font-black tracking-tight leading-tight text-center text-gray-900 italic mt-3 mb-4">
                            Stay in your rise
                        </h3>

                        {/* List items */}
                        <div className="space-y-2 my-4 max-w-xs mx-auto">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center mb-0.5">You'll</p>
                            {[
                              "Show up daily",
                              "Pay attention to what works",
                              "Finish what you start"
                            ].map((text, i) => (
                              <div key={i} className="flex items-center gap-2.5 pl-4">
                                <span className="text-[#0E7850] text-sm leading-none">•</span>
                                <span className="text-xs font-bold tracking-tight text-gray-800">{text}</span>
                              </div>
                            ))}
                        </div>

                        {/* Small momentum text */}
                        <p className="text-[10px] text-gray-400 font-bold text-center mb-4 px-4">
                            Small actions daily builds real momentum over time.
                        </p>

                        {/* Commitment Radio Button */}
                        <button 
                            onClick={() => !isProcessingPayment && setIsCommitted(!isCommitted)}
                            disabled={isProcessingPayment}
                            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all border-2 mb-4 text-left ${
                                isCommitted 
                                ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                : 'bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-400 hover:bg-white'
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

                        {/* WALLET / PRICING SECTION - Only show if user is logged in */}
                        {user ? (
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
                                            <span className="text-[11px] font-black uppercase text-gray-800">Use {sprint.pointCost || 10} Coins</span>
                                        </div>
                                        {((user as Participant)?.walletBalance ?? 0) < (sprint.pointCost || 10) && (
                                            <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Insufficient</span>
                                        )}
                                    </label>

                                    {/* Option 2: Card (Naira) */}
                                    <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                        paymentMethod === 'card' 
                                        ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                        : 'bg-white border-gray-150 text-gray-500'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                name="landing_payment_method" 
                                                checked={paymentMethod === 'card'} 
                                                onChange={() => setPaymentMethod('card')}
                                                disabled={isProcessingPayment}
                                                className="text-[#0E7850] focus:ring-[#0E7850] h-3.5 w-3.5"
                                            />
                                            <span className="text-[11px] font-black uppercase text-gray-800">Pay with Card</span>
                                        </div>
                                        <span className="text-xs font-black text-gray-900">₦{sprint.price || 1000}</span>
                                    </label>
                                </div>

                                <div className="text-center pt-0.5">
                                    <span className="text-[9px] font-semibold text-gray-400">
                                        Need more coins? <span className="underline cursor-pointer text-[#0E7850]" onClick={() => navigate('/buy-coins')}>Buy coins here</span>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // Guest Checkout Price display
                            commitmentContext?.emailExists !== false && (
                                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 mb-4 text-left flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-gray-400">Total Price</span>
                                    <span className="text-xs font-black text-gray-900">₦{sprint.price || 1000}</span>
                                </div>
                            )
                        )}

                        {/* Start Day 1 Now / Continue button */}
                        <Button 
                            onClick={handleConfirmCommitment}
                            disabled={!isCommitted || isProcessingPayment}
                            className={`w-full py-4 rounded-2xl shadow-xl transition-all text-[10px] font-black tracking-[0.2em] uppercase border-none ${
                                isCommitted && !isProcessingPayment
                                ? 'bg-gray-900 text-white hover:scale-[1.01] active:scale-95 shadow-gray-900/15' 
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isProcessingPayment ? "Processing..." : (commitmentContext?.isGuest && commitmentContext?.emailExists === false ? "Claim Free Day 1" : "Start Day 1 Now")}
                        </Button>
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