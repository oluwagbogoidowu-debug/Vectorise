import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, Coach, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Clock } from 'lucide-react';
import SprintCard from '../../components/SprintCard';
import FormattedText from '../../components/FormattedText';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';

const SprintPreviewPage: React.FC = () => {
    const { sprintId } = useParams<{ sprintId: string }>();
    const navigate = useNavigate();
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [coach, setCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [previewType, setPreviewType] = useState<'card' | 'landing' | 'daily'>('landing');
    const [selectedDay, setSelectedDay] = useState(1);
    const [previewTaskIndex, setPreviewTaskIndex] = useState(0);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setPreviewTaskIndex(0);
        setRevealedHints({});
    }, [selectedDay]);

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
                            // Fallback if coach not found
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
                        // Fallback for foundational sprints without coachId
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

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Loading preview...</p>
            </div>
        </div>;
    }

    if (!sprint || !coach) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest">Sprint not found or incomplete.</p>
                <button onClick={() => navigate(-1)} className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline">Go Back</button>
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
    const currentDailyContent = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(content => content.day === selectedDay) : undefined;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-3 mb-10">
                    <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all cursor-pointer shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sprint Preview</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Gain Clarity First</p>
                    </div>
                </header>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center mb-8">
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-8">
                        <button 
                            onClick={() => setPreviewType('card')}
                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'card' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Deck View
                        </button>
                        <button 
                            onClick={() => setPreviewType('landing')}
                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'landing' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                        >
                            Landing View
                        </button>
                        <button 
                            onClick={() => setPreviewType('daily')}
                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                        >
                            Daily Content
                        </button>
                    </div>

                    {previewType === 'card' && (
                        <div className="animate-fade-in flex flex-col items-center py-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 text-center">Registry Card Preview</h4>
                            <div className="w-full max-w-[320px] text-left">
                                <SprintCard 
                                    sprint={sprint} 
                                    coach={coach} 
                                    forceShowOutcomeTag={true} 
                                    isStatic={true}
                                />
                            </div>
                        </div>
                    )}

                    {previewType === 'landing' && (
                        <div className="animate-fade-in text-left bg-[#F8F9FA] -mx-8 -mb-8 p-6 md:p-10 rounded-b-[2.5rem] border-t border-gray-100">
                            <div className="max-w-screen-lg mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-8 space-y-8">
                                        {/* HERO SECTION */}
                                        <div className="relative h-[280px] sm:h-[340px] rounded-[3rem] overflow-hidden shadow-2xl group border-4 border-white bg-dark">
                                            <img 
                                                src={sprint.coverImageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'} 
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                                alt={sprint.title} 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'; }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
                                            <div className="absolute bottom-10 left-10 right-10 text-white">
                                                <div className="mb-4">
                                                    <span className="pl-3 pr-2 py-1.5 bg-[#0E7850] text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg inline-flex items-center">
                                                        {isFoundational ? 'FOUNDATIONAL PATH' : 'PREMIUM SPRINT'}
                                                    </span>
                                                </div>
                                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4">
                                                    <FormattedText text={sprint.title} inline />
                                                </h1>
                                                {sprint.subtitle && (
                                                    <p className="text-white/70 text-sm md:text-base font-medium tracking-tight mb-6 leading-snug max-w-xl">
                                                        {sprint.subtitle}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">
                                                    <Clock className="w-3 h-3" />
                                                    {sprint.duration} DAY JOURNEY
                                                </div>
                                            </div>
                                        </div>

                                        {/* MAIN CONTENT */}
                                        <div className="space-y-8">
                                            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm animate-fade-in">
                                                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Sprint Overview</h2>
                                                
                                                <div className="space-y-8">
                                                    {(sprint.description || sprint.subtitle) && (
                                                        <p className="text-base md:text-lg text-gray-600 font-medium leading-relaxed">
                                                            {sprint.description || sprint.subtitle}
                                                        </p>
                                                    )}

                                                    {Array.isArray(sprint.dynamicSections) && sprint.dynamicSections
                                                        .filter(section => section.body && section.body.trim().length > 0)
                                                        .map((section, index) => (
                                                            <div key={index} className="animate-fade-in pt-4 border-t border-gray-50">
                                                                {section.id !== 'overview' && <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">{section.title}</h3>}
                                                                <DynamicSectionRenderer section={section} />
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    <aside className="lg:col-span-4 space-y-6">
                                        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden relative group/card text-center">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
                                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover/card:bg-primary/10 transition-colors duration-700"></div>

                                            <div className="text-center mb-10 relative z-10">
                                                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Sprint Status</h2>
                                                <div className="flex flex-col items-center">
                                                    <h3 className="text-4.5xl font-black text-gray-900 tracking-tighter leading-none mb-1">
                                                        {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost || 0}` : `₦${(sprint.price || 0).toLocaleString()}`}
                                                    </h3>
                                                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Authorized Access</p>
                                                </div>
                                            </div>

                                            {/* Coach Info */}
                                            <div className="pt-8 border-t border-gray-100 relative z-10 text-left">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 text-center">Grounded Mentor</p>
                                                <div className="flex items-center gap-4">
                                                    <img src={displayCoachImage} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1 uppercase">{displayCoachName}</p>
                                                        <p className="text-[10px] font-black text-[#159E6A]/80 uppercase tracking-widest mb-1">{isFoundational ? 'AI Coach' : (coach.niche || 'Grounded Specialist')}</p>
                                                    </div>
                                                </div>
                                                <p className="mt-4 text-[11px] text-gray-500 font-medium leading-relaxed italic">{isFoundational ? 'Systems architect for the Vectorise core training modules.' : (coach.bio || 'Authorised Mentor.')}</p>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                    )}

                    {previewType === 'daily' && (
                        <div className="animate-fade-in text-left">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4">Daily Content Preview</h4>
                            <div className="flex overflow-x-auto gap-3 hide-scrollbar mb-8">
                                {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                                    <button 
                                        key={day} 
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 relative ${selectedDay === day ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-white'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tight">Day</span>
                                        <span className="font-black text-2xl leading-none">{day}</span>
                                    </button>
                                ))}
                            </div>
                            {currentDailyContent ? (
                                <div className="space-y-6 w-full">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                                        <h5 className="text-xl font-black text-gray-900">Day {selectedDay}: {sprint.title}</h5>
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Insight</p>
                                            <div className="text-sm text-gray-700 font-medium leading-relaxed">
                                                <FormattedText text={currentDailyContent.lessonText || 'No lesson text for this day.'} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 font-sans">
                                        {(() => {
                                            const activePrompts = currentDailyContent.taskPrompts?.filter(p => p && p.trim()) || (currentDailyContent.taskPrompt ? [currentDailyContent.taskPrompt] : []);
                                            if (activePrompts.length === 0) {
                                                return (
                                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden text-center text-gray-400 font-medium text-xs">
                                                        No action steps defined yet for Day {selectedDay}.
                                                    </div>
                                                );
                                            }

                                            const validIndex = Math.min(previewTaskIndex, activePrompts.length - 1);
                                            const prompt = activePrompts[validIndex] || "";
                                            const i = validIndex;

                                            return (
                                                <div className="space-y-6">
                                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden animate-fade-in">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Action Step {i + 1} of {activePrompts.length}</p>
                                                        <div className="text-gray-900 font-bold leading-relaxed mb-4 text-sm sm:text-base">
                                                            <FormattedText text={prompt || "Progress for this step will be submitted here."} />
                                                        </div>

                                                        {currentDailyContent.taskHints?.[i] && (
                                                            <div className="mb-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRevealedHints(prev => ({ ...prev, [i]: !prev[i] }))}
                                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest transition-all ${revealedHints[i] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                                >
                                                                    <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${revealedHints[i] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span>Hint</span>
                                                                </button>
                                                                {revealedHints[i] && (
                                                                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                                                        <FormattedText text={currentDailyContent.taskHints[i]} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-100/50">
                                                            {i > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewTaskIndex(i - 1)}
                                                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-primary transition-colors bg-white active:scale-95"
                                                                >
                                                                    Back
                                                                </button>
                                                            ) : <div />}

                                                            {i < activePrompts.length - 1 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewTaskIndex(i + 1)}
                                                                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm shadow-primary/10 active:scale-95"
                                                                >
                                                                    Next
                                                                </button>
                                                            ) : <div />}
                                                        </div>
                                                    </div>

                                                    {activePrompts.length > 1 && (
                                                        <div className="flex justify-center items-center gap-2 mt-4">
                                                            {activePrompts.map((_, idx) => (
                                                                <button
                                                                    type="button"
                                                                    key={idx} 
                                                                    onClick={() => setPreviewTaskIndex(idx)}
                                                                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === validIndex ? 'w-8 bg-primary' : 'w-2 bg-gray-200 hover:bg-primary/40'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500">No content available for Day {selectedDay}.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SprintPreviewPage;
