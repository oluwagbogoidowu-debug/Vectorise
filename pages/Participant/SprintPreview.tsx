import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Sprint, DailyContent } from '../../types';
import { sprintService } from '../../services/sprintService';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';

const SprintPreview: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const prefilledEmail = location.state?.prefilledEmail;

    useEffect(() => {
        const fetchSprint = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
            } catch (err) {
                console.error("Error fetching sprint for preview:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprint();
    }, [sprintId]);

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#FAFAFA]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 text-center"><h2 className="text-base font-black mb-4">Sprint not found.</h2><button onClick={() => navigate('/discover')} className="text-primary font-black uppercase tracking-widest text-xs">Back to Discover</button></div>;

    const day1Content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(dc => dc.day === 1) : undefined;

    return (
        <div className="w-full bg-[#FAFAFA] min-h-screen flex flex-col font-sans text-dark animate-fade-in pb-24">
            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Day Selector (Disabled/Preview) */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1 opacity-50">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                        <div
                            key={day}
                            className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 ${
                                day === 1 ? 'bg-[#0E7850] text-white shadow-xl' : 'bg-[#F3F4F6] text-gray-400'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${day === 1 ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                            <span className="text-3xl font-black leading-none">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day 1 (Preview)</h2>
                    
                    {/* Lesson Content - Locked 2/3 */}
                    <div className="space-y-2 mb-10 relative">
                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Insight</h2>
                        <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch] max-h-[300px] overflow-hidden relative">
                            <FormattedText text={day1Content?.lessonText || ""} />
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex flex-col items-center justify-end pb-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Sprint Locked
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Step - Locked after 5 lines */}
                    <div className="space-y-6 relative">
                        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                            <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Action Step</h2>
                            <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug max-h-[7.5rem] overflow-hidden relative">
                                <FormattedText text={day1Content?.taskPrompt || ""} />
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F9FBF9] via-[#F9FBF9]/90 to-transparent"></div>
                            </div>
                            <div className="mt-6 border-t border-primary/5 pt-4 flex flex-col items-center">
                                <Link 
                                    to="/signup" 
                                    state={{ prefilledEmail, targetSprintId: sprintId }}
                                    className="text-[10px] font-black text-primary hover:underline tracking-widest uppercase"
                                >
                                    Complete your account creation to unlock full sprint.
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintPreview;
