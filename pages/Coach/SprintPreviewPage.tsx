import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, Coach, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import LandingPreview from '../../components/LandingPreview';
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
                        dailyContent: Array.isArray(fetchedSprint.pendingChanges?.dailyContent) 
                            ? fetchedSprint.pendingChanges.dailyContent 
                            : (Array.isArray(fetchedSprint.dailyContent) ? fetchedSprint.dailyContent : []),
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
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{sprint.title}</p>
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
                        <div className="animate-fade-in flex flex-col items-center">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4">Registry Card Preview</h4>
                            <div className="w-full max-w-[320px]">
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
                        <div className="animate-fade-in text-left">
                            <div className="space-y-8">
                                {Array.isArray(sprint.dynamicSections) && sprint.dynamicSections.map((section, index) => (
                                    <section key={index} className="bg-white rounded-[2.5rem] p-10 md:p-14 border border-gray-100 shadow-sm">
                                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">{section.title}</h2>
                                        <DynamicSectionRenderer section={section} />
                                    </section>
                                ))}
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
                                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                    <h5 className="text-xl font-black text-gray-900">Day {selectedDay}: {sprint.title}</h5>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Insight</p>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed">{currentDailyContent.lessonText || 'No lesson text for this day.'}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Action Steps</p>
                                        {currentDailyContent.taskPrompts && currentDailyContent.taskPrompts.some(p => p.trim()) ? (
                                            <ul className="space-y-3">
                                                {currentDailyContent.taskPrompts.filter(p => p.trim()).map((prompt, i) => (
                                                    <li key={i} className="flex gap-3 items-start">
                                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary flex-shrink-0 mt-0.5">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-sm text-gray-700 font-medium leading-relaxed">{prompt}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed">{currentDailyContent.taskPrompt || 'No action step for this day.'}</p>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coach Insight</p>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed">{currentDailyContent.coachInsight || 'No coach insight for this day.'}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reflection Question</p>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed">{currentDailyContent.reflectionQuestion || 'No reflection question for this day.'}</p>
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
