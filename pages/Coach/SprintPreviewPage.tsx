import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, Coach, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { 
    Clock, Eye, Sparkles, Check, CheckCircle, CreditCard, 
    ChevronRight, ChevronLeft, Calendar, RotateCcw, AlertCircle, Play, Info
} from 'lucide-react';
import SprintCard from '../../components/SprintCard';
import FormattedText from '../../components/FormattedText';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';
import SprintCompletionModal from '../../components/SprintCompletionModal';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

// Inline Day Completion Modal for simulation
const SimDayCompletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    day: number;
}> = ({ isOpen, onClose, day }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden border border-gray-100">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                    <svg
                        className="w-12 h-12 relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Great Job!
                </h3>
                <p className="text-gray-500 font-medium mb-8">
                    You've successfully completed Day {day} of the sprint. Keep up the momentum!
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95 cursor-pointer"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

const SprintPreviewPage: React.FC = () => {
    const { sprintId } = useParams<{ sprintId: string }>();
    const navigate = useNavigate();
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [coach, setCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Core Preview State
    const [previewType, setPreviewType] = useState<'card' | 'landing' | 'daily'>('landing');
    const [selectedDay, setSelectedDay] = useState(1);
    const [previewTaskIndex, setPreviewTaskIndex] = useState(0);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

    // Participant Simulation State
    const isSimulator = true;
    const [simStage, setSimStage] = useState<'card' | 'landing' | 'payment' | 'active'>('card');
    const [simSelectedDay, setSimSelectedDay] = useState(1);
    const [simTaskIndex, setSimTaskIndex] = useState(0);
    const [simAnswers, setSimAnswers] = useState<Record<number, string[]>>({}); // day -> list of answers
    const [simCompletedDays, setSimCompletedDays] = useState<Record<number, boolean>>({});
    const [simIsPaid, setSimIsPaid] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    // Modal states for simulation
    const [isDayCompletionOpen, setIsDayCompletionOpen] = useState(false);
    const [isGraduateModalOpen, setIsGraduateModalOpen] = useState(false);
    const [simTagInput, setSimTagInput] = useState('');
    const [simRevealedHints, setSimRevealedHints] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setPreviewTaskIndex(0);
        setRevealedHints({});
    }, [selectedDay]);

    useEffect(() => {
        setSimTaskIndex(0);
        setSimRevealedHints({});
    }, [simSelectedDay]);

    useEffect(() => {
        const fetchSprint = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const fetchedSprint = await sprintService.getSprintById(sprintId);
                if (fetchedSprint) {
                    // Merge pending changes for preview
                    const mergedSprint: Sprint = {
                        ...fetchedSprint,
                        ...(fetchedSprint.pendingChanges || {}),
                        dailyContent: (Array.isArray(fetchedSprint.pendingChanges?.dailyContent) 
                            ? fetchedSprint.pendingChanges.dailyContent 
                            : (Array.isArray(fetchedSprint.dailyContent) ? fetchedSprint.dailyContent : [])).map(c => ({
                                ...c,
                                taskPrompts: (c as any).taskPrompts || [c.taskPrompt || '']
                            })),
                        outcomes: Array.isArray(fetchedSprint.pendingChanges?.outcomes)
                            ? fetchedSprint.pendingChanges.outcomes
                            : (Array.isArray(fetchedSprint.outcomes) ? fetchedSprint.outcomes : []),
                        forWho: Array.isArray(fetchedSprint.pendingChanges?.forWho)
                            ? fetchedSprint.pendingChanges.forWho
                            : (Array.isArray(fetchedSprint.forWho) ? fetchedSprint.forWho : []),
                        dynamicSections: Array.isArray(fetchedSprint.pendingChanges?.dynamicSections)
                            ? fetchedSprint.pendingChanges.dynamicSections
                            : (Array.isArray(fetchedSprint.dynamicSections) ? fetchedSprint.dynamicSections : []),
                    };
                    setSprint(mergedSprint);

                    if (mergedSprint.coachId) {
                        const coachData = await userService.getUserDocument(mergedSprint.coachId);
                        if (coachData) {
                            setCoach(coachData as Coach);
                        } else {
                            setCoach({
                                id: mergedSprint.coachId,
                                name: 'Platform Coach',
                                email: 'support@vectorise.ai',
                                bio: 'Vectorise Core Team',
                                profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
                                role: UserRole.COACH,
                                niche: 'Core Platform',
                                approved: true
                            });
                        }
                    } else {
                        setCoach({
                            id: 'platform',
                            name: 'Vectorise',
                            email: 'support@vectorise.ai',
                            bio: 'The Vectorise Core Team',
                            profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
                            role: UserRole.COACH,
                            niche: 'Core Platform',
                            approved: true
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch sprint for preview:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprint();
    }, [sprintId]);

    // Handle updates to simulation answers
    const handleUpdateSimAnswer = (dayNum: number, stepIdx: number, value: string) => {
        setSimAnswers(prev => {
            const currentDayAnswers = prev[dayNum] ? [...prev[dayNum]] : [];
            currentDayAnswers[stepIdx] = value;
            return {
                ...prev,
                [dayNum]: currentDayAnswers
            };
        });
    };

    const handleAddSimTag = (dayNum: number, stepIdx: number, tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const currentAnswers = simAnswers[dayNum]?.[stepIdx] || '[]';
        let tags: string[] = [];
        try {
            tags = JSON.parse(currentAnswers);
            if (!Array.isArray(tags)) tags = [];
        } catch (e) {
            tags = currentAnswers ? [currentAnswers] : [];
        }
        if (!tags.includes(trimmed)) {
            const updated = [...tags, trimmed];
            handleUpdateSimAnswer(dayNum, stepIdx, JSON.stringify(updated));
        }
        setSimTagInput('');
    };

    const handleRemoveSimTag = (dayNum: number, stepIdx: number, tagIndex: number) => {
        const currentAnswers = simAnswers[dayNum]?.[stepIdx] || '[]';
        try {
            const tags = JSON.parse(currentAnswers);
            if (Array.isArray(tags)) {
                tags.splice(tagIndex, 1);
                handleUpdateSimAnswer(dayNum, stepIdx, JSON.stringify(tags));
            }
        } catch (e) {}
    };

    const triggerConfetti = () => {
        try {
            confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 }
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Loading preview...</p>
                </div>
            </div>
        );
    }

    if (!sprint || !coach) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-4 font-sans">
                <p className="text-[10px] font-black uppercase tracking-widest">Sprint not found or incomplete.</p>
                <button onClick={() => navigate(-1)} className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline cursor-pointer">Go Back</button>
            </div>
        );
    }

    const isFoundational = sprint.sprintType === 'Foundational' || 
                           sprint.sprintType === 'Fundamentals' ||
                           sprint.sprintType === 'Core' ||
                           sprint.sprintType === 'Expert' ||
                           sprint.category === 'Core Platform Sprint' || 
                           sprint.category === 'Growth Fundamentals';

    const displayCoachName = isFoundational ? 'Vectorise' : (coach.name || 'Vectorise');
    const displayCoachImage = isFoundational ? 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd' : (coach.profileImageUrl || 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd');
    
    // Day content for Coach's Preview
    const currentDailyContent = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(content => content.day === selectedDay) : undefined;
    
    // Day content for Participant Simulator
    const simDailyContent = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(content => content.day === simSelectedDay) : undefined;
    const simActivePrompts = simDailyContent?.taskPrompts?.filter(p => p && p.trim()) || (simDailyContent?.taskPrompt ? [simDailyContent.taskPrompt] : []);

    return (
        <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-150">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 text-gray-400 hover:text-primary hover:bg-white border border-gray-150 rounded-2xl transition-all cursor-pointer shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-950 tracking-tight leading-none mb-1">Sprint Stimulation</h1>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Exact Participant Experience Sandbox</p>
                        </div>
                    </div>
                </header>

                {/* ----------------- INTERACTIVE PARTICIPANT SIMULATOR ----------------- */}
                {isSimulator && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Control Deck Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-center lg:text-left">
                                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-sm tracking-tight text-emerald-400">Participant Simulator Active</h3>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Experience exactly how the end-user enrolls, commits, and completes each day.</p>
                                </div>
                            </div>
                            
                            {/* Breadcrumbs for instant skip */}
                            <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                                {[
                                    { id: 'card', label: '1. Deck Card' },
                                    { id: 'landing', label: '2. Landing page' },
                                    { id: 'payment', label: '3. Checkout' },
                                    { id: 'active', label: '4. Classroom Day' }
                                ].map((stage) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => {
                                            setSimStage(stage.id as any);
                                            if (stage.id === 'active') {
                                                setSimIsPaid(true); // Auto-pay if jumping straight to course
                                            }
                                        }}
                                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${simStage === stage.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105 font-black' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {stage.label}
                                    </button>
                                ))}
                            </div>

                            {/* Reset Simulation */}
                            <button
                                onClick={() => {
                                    setSimStage('card');
                                    setSimSelectedDay(1);
                                    setSimTaskIndex(0);
                                    setSimAnswers({});
                                    setSimCompletedDays({});
                                    setSimIsPaid(false);
                                    setSimRevealedHints({});
                                    toast.success("Simulation reset to starting line!");
                                }}
                                className="bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 transition-all px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Reset Flow</span>
                            </button>
                        </div>

                        {/* SUBSTAGE RENDERING */}
                        
                        {/* 1. DECK CARD VIEW */}
                        {simStage === 'card' && (
                            <div className="animate-fade-in flex flex-col items-center justify-center py-12 bg-white rounded-[2.5rem] border border-gray-150 p-8 shadow-sm">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Participant view in discover catalog</span>
                                <h4 className="text-xl font-bold text-gray-800 mb-8">Select Your Sprint Card</h4>
                                <div 
                                    onClick={() => {
                                        setSimStage('landing');
                                        toast.success("Opened Sprint Landing details!");
                                    }}
                                    className="cursor-pointer transition-transform duration-300 hover:scale-[1.03] active:scale-95 text-left w-full max-w-[340px]"
                                >
                                    <SprintCard 
                                        sprint={sprint} 
                                        coach={coach} 
                                        forceShowOutcomeTag={true} 
                                        isStatic={true}
                                    />
                                </div>
                                <p className="mt-8 text-xs text-gray-500 text-center font-medium">Click the card to open the description page, representing how users enter details.</p>
                            </div>
                        )}

                        {/* 2. DESCRIPTION LANDING PAGE */}
                        {simStage === 'landing' && (
                            <div className="animate-fade-in bg-[#FAFAFA] border border-gray-150 rounded-[2.5rem] p-6 md:p-10 shadow-sm relative">
                                <div className="absolute top-6 right-8 bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider">
                                    <Info className="w-3\.5 h-3\.5" />
                                    <span>Description Landing Preview</span>
                                </div>

                                <div className="max-w-screen-lg mx-auto mt-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-8 space-y-8 text-left">
                                            {/* HERO COVER SCREEN */}
                                            <div className="relative h-[250px] sm:h-[320px] rounded-[3rem] overflow-hidden shadow-xl border border-gray-100">
                                                <img 
                                                    src={sprint.coverImageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'} 
                                                    className="w-full h-full object-cover" 
                                                    alt={sprint.title} 
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>
                                                <div className="absolute bottom-8 left-8 right-8 text-white">
                                                    <div className="mb-3">
                                                        <span className="px-2.5 py-1 bg-[#159E6A] rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">
                                                            {isFoundational ? 'FOUNDATIONAL JOURNEY' : 'PREMIUM COURSE'}
                                                        </span>
                                                    </div>
                                                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2">
                                                        {sprint.title}
                                                    </h1>
                                                    <p className="text-white/80 text-xs md:text-sm font-medium tracking-tight mb-4 line-clamp-2">
                                                        {sprint.subtitle}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-wider">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {sprint.duration} DAY ACCELERATION
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DESCRIPTION BOX */}
                                            <div className="bg-white rounded-[2rem] p-8 border border-gray-150 shadow-sm">
                                                <h2 className="text-[10px] font-black text-primary uppercase tracking-wider mb-4">Sprint Overview</h2>
                                                <div className="text-sm md:text-base text-gray-650 font-medium leading-[1.6] space-y-4">
                                                    <FormattedText text={sprint.description || sprint.subtitle || ""} />
                                                </div>

                                                {/* DYNAMIC COMPONENT BLOCKS */}
                                                {Array.isArray(sprint.dynamicSections) && sprint.dynamicSections
                                                    .filter(section => section.body && section.id !== 'identity')
                                                    .map((section, idx) => (
                                                        <div key={idx} className="mt-8 pt-6 border-t border-gray-150 animate-fade-in text-left">
                                                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">{section.title}</h3>
                                                            <DynamicSectionRenderer section={section} />
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>

                                        {/* LANDING SIDEBAR BUTTONS */}
                                        <div className="lg:col-span-4 text-center">
                                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-150 shadow-md relative text-center">
                                                <div className="text-center mb-8">
                                                    <h2 className="text-[9px] font-black text-primary uppercase tracking-widest mb-3">Entrance Cost</h2>
                                                    <h3 className="text-3xl font-black text-gray-950 tracking-tight leading-none mb-1">
                                                        {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost || 0} COINS` : `₦${(sprint.price || 0).toLocaleString()}`}
                                                    </h3>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">One-time Access Commitment</p>
                                                </div>

                                                {/* Trigger Payment Checkout simulation */}
                                                <button
                                                    onClick={() => setSimStage('payment')}
                                                    className="w-full py-4 bg-gray-950 hover:bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <span>Join Sprint Journey</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>

                                                {/* Grounded Specialist Profile card */}
                                                <div className="pt-6 mt-6 border-t border-gray-150 text-left">
                                                    <div className="flex items-center gap-3">
                                                        <img src={displayCoachImage} className="w-12 h-12 rounded-xl object-cover border border-gray-150" alt="" />
                                                        <div>
                                                            <p className="text-xs font-black text-gray-905 uppercase leading-tight">{displayCoachName}</p>
                                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">{isFoundational ? 'SYSTEM ARCHITECT' : (coach.niche || 'SPECIALIST')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. SIMULATED CHECKOUT */}
                        {simStage === 'payment' && (
                            <div className="animate-fade-in flex flex-col items-center justify-center py-8">
                                <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-gray-150 shadow-lg overflow-hidden text-left font-sans">
                                    <div className="bg-gray-950 text-white p-8">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Commitment Verification</span>
                                        <h3 className="text-2xl font-black text-white tracking-tight mt-1">Simulated Checkout</h3>
                                        <div className="mt-4 flex items-center gap-3 bg-white/10 p-3 rounded-2xl text-[11px] font-medium text-white/80">
                                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                            <span>This is a simulated transaction. No actual coins or currency will be charged to your wallet.</span>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-6">
                                        {/* Purchase Summary */}
                                        <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-150">
                                            <img 
                                                src={sprint.coverImageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'} 
                                                className="w-16 h-16 rounded-xl object-cover" 
                                                alt="" 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'; }}
                                            />
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-gray-900 truncate">{sprint.title}</h4>
                                                <p className="text-xs text-gray-400 font-medium">{sprint.duration} Days Acceleration</p>
                                            </div>
                                            <div className="ml-auto text-right shrink-0">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">Price</span>
                                                <span className="text-sm font-black text-gray-950">
                                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost || 0}` : `₦${(sprint.price || 0).toLocaleString()}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment method selection list */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Simulated Payment Tool</label>
                                            <div className="p-4 border border-emerald-500/30 bg-emerald-50/50 rounded-2xl flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-emerald-900">Sandbox Auto-Debit</p>
                                                    <p className="text-[10.5px] font-semibold text-emerald-700/80">Simulated wallet balance: Balance ok</p>
                                                </div>
                                                <div className="ml-auto">
                                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px]">
                                                        <Check className="w-4 h-4" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Submit buttons */}
                                        <button
                                            onClick={async () => {
                                                setIsProcessingPayment(true);
                                                await new Promise(resolve => setTimeout(resolve, 1200));
                                                setIsProcessingPayment(false);
                                                setSimIsPaid(true);
                                                setSimStage('active');
                                                triggerConfetti();
                                                toast.success("Joined sprint successfully!");
                                            }}
                                            disabled={isProcessingPayment}
                                            className="w-full py-4.5 bg-[#159E6A] hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                        >
                                            {isProcessingPayment ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Processing Sandbox Gateway...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Authorize Simulated Transaction</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. ACTIVE SPRINT CLASSROOM DAY VIEW */}
                        {simStage === 'active' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-150 p-6 md:p-10 shadow-sm text-left font-sans">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-150 pb-6 mb-8 gap-4">
                                    <div>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Classroom Sandbox Daily View</span>
                                        <h3 className="text-2xl font-black text-gray-950 tracking-tight mt-1">{sprint.title}</h3>
                                    </div>
                                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-150 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl">
                                        Enrollment Authenticated
                                    </div>
                                </div>

                                {/* Horizontal Day Grid bar */}
                                <div className="mb-10 space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sprint Timeline (Click freely to view all)</span>
                                        <span className="text-xs font-bold text-gray-500">Day {simSelectedDay} of {sprint.duration}</span>
                                    </div>
                                    
                                    <div className="flex overflow-x-auto gap-3 hide-scrollbar py-2 px-1">
                                        {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => {
                                            const isDayCompleted = simCompletedDays[day] === true;
                                            return (
                                                <button 
                                                    key={day} 
                                                    onClick={() => {
                                                        setSimSelectedDay(day);
                                                        setSimTaskIndex(0);
                                                    }}
                                                    className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 relative cursor-pointer ${simSelectedDay === day ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-105' : 'bg-gray-55 border-gray-150 text-gray-405 hover:border-primary/20 hover:text-primary hover:bg-white'} `}
                                                >
                                                    <span className="text-[9px] font-black uppercase tracking-tight">Day</span>
                                                    <span className="font-black text-2xl leading-none mt-1">{day}</span>
                                                    {isDayCompleted && (
                                                        <div className="absolute -top-1.5 -right-1.5 bg-[#159E6A] text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                                            <Check className="w-3 h-3" strokeWidth={3.5} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Content split */}
                                {simDailyContent ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                        {/* Left Side: Insight Reading */}
                                        <div className="lg:col-span-7 bg-gray-55 p-8 rounded-[2rem] border border-gray-150 text-left space-y-6">
                                            <div className="flex items-center gap-3 pb-4 border-b border-gray-150">
                                                <div className="w-10 h-10 bg-white border border-gray-150 rounded-xl flex items-center justify-center text-primary shadow-sm font-black text-xs">
                                                    0{simSelectedDay}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Today's Reading Insight</h4>
                                                    <h3 className="text-lg font-black text-gray-900 tracking-tight leading-snug">Day {simSelectedDay} Mindset</h3>
                                                </div>
                                            </div>
                                            <div className="text-sm md:text-base text-gray-700 leading-relaxed font-semibold">
                                                <FormattedText text={simDailyContent.lessonText || "No lesson text defined for this day."} />
                                            </div>
                                        </div>

                                        {/* Right Side: Active Step & Input Simulation */}
                                        <div className="lg:col-span-5 space-y-6">
                                            {simActivePrompts.length > 0 ? (
                                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-md flex flex-col text-left space-y-6 relative overflow-hidden">
                                                    {/* Step status bar */}
                                                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-2">
                                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1.5 rounded-lg">
                                                            Exercise {simTaskIndex + 1} of {simActivePrompts.length}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-bold">Action Frame</span>
                                                    </div>

                                                    {/* The Prompt Text */}
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">My Task</p>
                                                        <div className="text-sm md:text-base text-gray-950 font-black leading-relaxed">
                                                            <FormattedText text={simActivePrompts[simTaskIndex] || "Progress for this step will be submitted here."} />
                                                        </div>
                                                    </div>

                                                    {/* Footnotes if any */}
                                                    {simDailyContent.taskFootnotes?.[simTaskIndex] && (
                                                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-[11px] sm:text-xs font-semibold leading-relaxed mb-4">
                                                            <div className="flex gap-2">
                                                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={3} />
                                                                <FormattedText text={simDailyContent.taskFootnotes[simTaskIndex]} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Hints if defined */}
                                                    {simDailyContent.taskHints?.[simTaskIndex] && (
                                                        <div className="space-y-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSimRevealedHints(prev => ({ ...prev, [simTaskIndex]: !prev[simTaskIndex] }))}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${simRevealedHints[simTaskIndex] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                            >
                                                                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${simRevealedHints[simTaskIndex] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span>Click to Reveal Hint</span>
                                                            </button>
                                                            {simRevealedHints[simTaskIndex] && (
                                                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs font-semibold text-amber-900 leading-relaxed italic animate-fade-in">
                                                                    <FormattedText text={simDailyContent.taskHints[simTaskIndex]} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ---------------- INTERACTIVE CUSTOM INPUT RENDERER ---------------- */}
                                                    <div className="bg-gray-50/50 p-5 rounded-[1.5rem] border border-gray-150/80 space-y-4">
                                                        {(() => {
                                                            const inputType = String(simDailyContent.taskInputTypes?.[simTaskIndex] || "text").trim().toLowerCase();
                                                            
                                                            // TAGS TYPE
                                                            if (inputType === "tags") {
                                                                const tagsStr = simAnswers[simSelectedDay]?.[simTaskIndex] || '[]';
                                                                let tagChips: string[] = [];
                                                                try { tagChips = JSON.parse(tagsStr); if (!Array.isArray(tagChips)) tagChips = []; } catch(e) {}
                                                                
                                                                return (
                                                                    <div className="space-y-4 text-left">
                                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Structured Tag Collector</label>
                                                                        
                                                                        <div className="flex flex-wrap gap-1.5 p-3 min-h-[50px] bg-white border border-gray-150 rounded-2xl">
                                                                            {tagChips.length === 0 ? (
                                                                                <span className="text-[11px] text-gray-400 italic">No tags selected yet...</span>
                                                                            ) : (
                                                                                tagChips.map((tag, tIdx) => (
                                                                                    <span key={tIdx} className="inline-flex items-center gap-1 bg-[#159E6A]/10 text-emerald-800 border border-[#159E6A]/20 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                                                                                        <span>{tag}</span>
                                                                                        <button 
                                                                                            onClick={() => handleRemoveSimTag(simSelectedDay, simTaskIndex, tIdx)}
                                                                                            className="hover:bg-emerald-250 p-0.5 rounded-full text-emerald-700 font-extrabold"
                                                                                        >
                                                                                            &times;
                                                                                        </button>
                                                                                    </span>
                                                                                ))
                                                                            )}
                                                                        </div>

                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Type an alignment keyword..."
                                                                                value={simTagInput}
                                                                                onChange={(e) => setSimTagInput(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        e.preventDefault();
                                                                                        handleAddSimTag(simSelectedDay, simTaskIndex, simTagInput);
                                                                                    }
                                                                                }}
                                                                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleAddSimTag(simSelectedDay, simTaskIndex, simTagInput)}
                                                                                className="px-4 bg-gray-900 border border-gray-900 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:bg-gray-800"
                                                                            >
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-400 italic font-semibold">Type tag keywords and press enter to simulate the tag builder.</p>
                                                                    </div>
                                                                );
                                                            }

                                                            // POLL TYPE
                                                            if (inputType === "poll") {
                                                                let pollOpts: string[] = [];
                                                                try {
                                                                    const rawOpts = simDailyContent.taskPollOptions?.[simTaskIndex];
                                                                    if (rawOpts) {
                                                                        pollOpts = JSON.parse(rawOpts);
                                                                    }
                                                                } catch(e) {}
                                                                if (pollOpts.length === 0) {
                                                                    pollOpts = ["Option A", "Option B", "Option C"]; // default fallback
                                                                }
                                                                const chosenVal = simAnswers[simSelectedDay]?.[simTaskIndex] || "";

                                                                return (
                                                                    <div className="space-y-3 text-left">
                                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select One Realization Option</label>
                                                                        <div className="space-y-2">
                                                                            {pollOpts.map((opt, oIdx) => {
                                                                                const isSelected = chosenVal === opt;
                                                                                return (
                                                                                    <div
                                                                                        key={oIdx}
                                                                                        onClick={() => handleUpdateSimAnswer(simSelectedDay, simTaskIndex, opt)}
                                                                                        className={`p-3.5 border rounded-2xl text-xs font-black cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 border-[#159E6A] text-emerald-950' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                                                    >
                                                                                        <span className="leading-tight">{opt}</span>
                                                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#159E6A] bg-[#159E6A] text-white' : 'border-gray-350'}`}>
                                                                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // MARK AS COMPLETE TYPE
                                                            if (inputType === "mark") {
                                                                const isChecked = simAnswers[simSelectedDay]?.[simTaskIndex] === "completed";
                                                                return (
                                                                    <div className="space-y-3 py-2 text-left">
                                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity Checkoff</label>
                                                                        <div 
                                                                            onClick={() => handleUpdateSimAnswer(simSelectedDay, simTaskIndex, isChecked ? "" : "completed")}
                                                                            className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 ${isChecked ? 'bg-emerald-50 border-[#159E6A]/50 text-emerald-900 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                                        >
                                                                            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-[#159E6A] border-[#159E6A] text-white' : 'border-gray-300'}`}>
                                                                                {isChecked && <Check className="w-5 h-5 stroke-[3]" />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-black">Verify Exercise Requirement</p>
                                                                                <p className="text-[10px] font-medium text-gray-450 leading-none mt-0.5">Check when you finished today's action block.</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // NOTE TYPE (INFORMATIONAL)
                                                            if (inputType === "note") {
                                                                return (
                                                                    <div className="space-y-3 text-left">
                                                                        <div className="p-4 bg-emerald-500/10 border border-[#159E6A]/15 rounded-2xl flex items-start gap-3">
                                                                            <div className="w-10 h-10 rounded-xl bg-[#159E6A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/15">
                                                                                <Info className="w-5 h-5" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-black text-emerald-900 uppercase tracking-wide leading-tight">Insight Memo Block</p>
                                                                                <p className="text-[11px] text-emerald-700/90 font-semibold leading-relaxed mt-1">Review guidelines above. No submission is needed for this step. Click Submit to advance.</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // DEFAULT TEXT TYPE
                                                            return (
                                                                <div className="space-y-3 text-left">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">My Journal Reflection</label>
                                                                    <textarea
                                                                        value={simAnswers[simSelectedDay]?.[simTaskIndex] || ''}
                                                                        onChange={(e) => handleUpdateSimAnswer(simSelectedDay, simTaskIndex, e.target.value)}
                                                                        placeholder="Type your reflection or action logs..."
                                                                        className="w-full h-32 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary placeholder-gray-400"
                                                                    />
                                                                    <div className="flex justify-end text-[10px] text-gray-400 font-bold uppercase mr-1">
                                                                        {(simAnswers[simSelectedDay]?.[simTaskIndex] || '').length} characters logged
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Control action buttons */}
                                                    <div className="flex gap-4 pt-4 border-t border-gray-100 flex-shrink-0">
                                                        {simTaskIndex > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSimTaskIndex(simTaskIndex - 1)}
                                                                className="px-5 py-3 border border-gray-250 bg-white hover:bg-gray-50 text-gray-500 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-active cursor-pointer active:scale-95 transition-all"
                                                            >
                                                                Back
                                                            </button>
                                                        ) : <div />}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Advance or trigger complete Day
                                                                if (simTaskIndex < simActivePrompts.length - 1) {
                                                                    setSimTaskIndex(simTaskIndex + 1);
                                                                    toast.success("Progressing to next task step.");
                                                                } else {
                                                                    // Complete Day ! Automatically advances to next Day
                                                                    setSimCompletedDays(prev => ({ ...prev, [simSelectedDay]: true }));
                                                                    triggerConfetti();
                                                                    
                                                                    if (simSelectedDay < sprint.duration) {
                                                                        setIsDayCompletionOpen(true);
                                                                    } else {
                                                                        // Sprint finished entirely! Graduation Modal triggers
                                                                        setIsGraduateModalOpen(true);
                                                                    }
                                                                }
                                                            }}
                                                            className="flex-1 py-3 px-5 bg-gray-950 hover:bg-gray-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                                                        >
                                                            <span>
                                                                {simTaskIndex < simActivePrompts.length - 1 ? 'Save & Proceed' : `Graduate Day ${simSelectedDay}`}
                                                            </span>
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-gray-50 text-center rounded-2xl text-gray-400 text-xs italic">
                                                    No exercises configured yet for Day {simSelectedDay}.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 mt-8">No daily classroom content defined.</p>
                                )}
                            </div>
                        )}
                        
                        {/* Simulation Modals */}
                        <SimDayCompletionModal 
                            isOpen={isDayCompletionOpen} 
                            onClose={() => {
                                setIsDayCompletionOpen(false);
                                // Open next day automatically !
                                const nextGroupDay = simSelectedDay + 1;
                                if (nextGroupDay <= sprint.duration) {
                                    setSimSelectedDay(nextGroupDay);
                                    setSimTaskIndex(0);
                                    toast.success(`Day ${nextGroupDay} started automatically!`);
                                }
                            }} 
                            day={simSelectedDay} 
                        />

                        {/* Interactive Sprint Completion Graduation Modal */}
                        <SprintCompletionModal 
                            isOpen={isGraduateModalOpen} 
                            onStartNext={() => {
                                setIsGraduateModalOpen(false);
                                setSimStage('card');
                                setSimSelectedDay(1);
                                setSimTaskIndex(0);
                                setSimAnswers({});
                                setSimCompletedDays({});
                                setSimIsPaid(false);
                                toast.success("Restarted simulator pathway!");
                            }} 
                            onClose={() => {
                                setIsGraduateModalOpen(false);
                                setSimStage('card');
                                setSimIsPaid(false);
                            }} 
                            sprintTitle={sprint.title}
                            streakCount={sprint.duration || 5}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SprintPreviewPage;
