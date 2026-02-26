import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import LandingPreview from '../../components/LandingPreview';
import SprintCard from '../../components/SprintCard';

const SprintPreviewPage: React.FC = () => {
    const { sprintId } = useParams<{ sprintId: string }>();
    const navigate = useNavigate();
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [coach, setCoach] = useState<Coach | null>(null);
    const [previewType, setPreviewType] = useState<'card' | 'landing' | 'daily'>('landing');
    const [selectedDay, setSelectedDay] = useState(1);

    useEffect(() => {
        const fetchSprint = async () => {
            if (!sprintId) return;
            try {
                const fetchedSprint = await sprintService.getSprintById(sprintId);
                setSprint(fetchedSprint);
                // Assuming coach data is part of sprint or can be fetched separately
                // For now, using a placeholder or fetching from sprint.coachId
                if (fetchedSprint?.coachId) {
                    // In a real app, you'd fetch the coach details here
                    setCoach({ id: fetchedSprint.coachId, name: 'Coach Name', email: 'coach@example.com', bio: 'A dedicated coach.', profileImageUrl: 'https://picsum.photos/seed/coach/100/100', role: 'coach', createdAt: '' });
                }
            } catch (error) {
                console.error("Failed to fetch sprint for preview:", error);
                navigate('/coach/sprints');
            }
        };
        fetchSprint();
    }, [sprintId, navigate]);

    if (!sprint || !coach) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading preview...</div>;
    }

    const currentDailyContent = sprint.dailyContent.find(content => content.day === selectedDay);

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
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Sprint Preview</h1>
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
                        <div className="animate-fade-in">
                            <LandingPreview sprint={sprint} coach={coach} />
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
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Action Step</p>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed">{currentDailyContent.taskPrompt || 'No action step for this day.'}</p>
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
