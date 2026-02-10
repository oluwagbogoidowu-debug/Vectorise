import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, Sprint, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import FormattedText from '../../components/FormattedText';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.25em] mb-4`}>
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
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
                
                if (data) {
                    const dbCoach = await userService.getUserDocument(data.coachId);
                    setFetchedCoach(dbCoach as Coach);
                }
            } catch (err) {
                console.error("Error fetching sprint landing data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [sprintId]);

    const handleJoinClick = () => {
        if (!sprint) return;
        navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint } });
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light text-[8px] font-black uppercase tracking-[0.2em] text-gray-300">Synchronizing registry...</div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-base font-black mb-2">Registry item not found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

    const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';
    const sprintCoach = isFoundational ? { name: 'Vectorise Platform', profileImageUrl: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw', niche: 'Core Protocol' } : (fetchedCoach || { name: 'Expert Coach', profileImageUrl: `https://ui-avatars.com/api/?name=Coach&background=0E7850&color=fff`, niche: 'Guide' });

    return (
        <div className="bg-light min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
            <div className="max-w-screen-lg mx-auto px-4 pt-2">
                
                <div className="flex justify-between items-center mb-3">
                    <button 
                        onClick={() => navigate('/discover')} 
                        className="group flex items-center text-gray-400 hover:text-primary transition-all text-[8px] font-black uppercase tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 mr-1 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registry
                    </button>
                    <div className="px-2 py-0.5 rounded-md border border-primary/20 bg-primary/5 text-primary text-[7px] font-black uppercase tracking-widest">
                        {isFoundational ? 'Foundational Path' : 'Registry Path'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    
                    <div className="lg:col-span-8 space-y-4">
                        
                        <div className="relative h-[200px] sm:h-[280px] lg:h-[360px] rounded-2xl overflow-hidden shadow-lg group">
                            <img 
                                src={sprint.coverImageUrl} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                alt={sprint.title} 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 right-6 text-white">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="px-2 py-0.5 bg-primary rounded text-[7px] font-black uppercase tracking-widest border border-white/10 shadow-lg">{sprint.category}</span>
                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[7px] font-black uppercase tracking-widest border border-white/10">{sprint.difficulty}</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1 italic">
                                    <FormattedText text={sprint.title} />
                                </h1>
                                <p className="text-white/60 text-[8px] font-bold uppercase tracking-[0.3em]">{sprint.duration} Day Protocol</p>
                            </div>
                        </div>

                        <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <SectionHeading>The Transformation</SectionHeading>
                                {sprint.outcomeTag && (
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic">{sprint.outcomeTag}</span>
                                )}
                            </div>
                            <div className="space-y-6 text-gray-600 leading-relaxed text-[12px] font-medium">
                                <p className="text-gray-900 font-bold text-lg leading-tight italic">
                                    <FormattedText text={sprint.transformation || sprint.description} />
                                </p>
                                
                                <div className="h-px bg-gray-50 my-6"></div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sprint.forWho && sprint.forWho.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">This sprint is for you if:</h4>
                                            <ul className="space-y-2">
                                                {sprint.forWho.map((item, i) => (
                                                    <li key={i} className="flex gap-2 items-start">
                                                        <span className="text-primary mt-0.5 text-[10px]">●</span>
                                                        <p className="text-[11px] italic font-medium leading-snug">{item}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {sprint.notForWho && sprint.notForWho.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">This sprint is not for you if:</h4>
                                            <ul className="space-y-2">
                                                {sprint.notForWho.map((item, i) => (
                                                    <li key={i} className="flex gap-2 items-start opacity-60">
                                                        <span className="text-red-400 mt-0.5 text-[10px]">✕</span>
                                                        <p className="text-[11px] font-medium leading-snug">{item}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                            <section className="bg-dark text-white rounded-2xl p-8 relative overflow-hidden group shadow-xl">
                                <SectionHeading color="primary">How This Sprint Works</SectionHeading>
                                <div className="relative z-10 space-y-6">
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                                        <p className="text-lg font-black text-white italic tracking-tight mb-4">
                                            For {sprint.duration} days, you’ll complete one focused action per day.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {sprint.methodSnapshot.map((item, i) => (
                                                <div key={i} className="space-y-1">
                                                    <p className="text-primary font-black uppercase text-[9px] tracking-widest">{item.verb}</p>
                                                    <p className="text-[10px] text-white/40 leading-tight">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-center text-primary font-black uppercase tracking-[0.2em] text-[10px] pt-4 border-t border-white/5">
                                        Real breakthroughs emerge from what you do.
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                            </section>
                        )}

                        {sprint.outcomes && sprint.outcomes.length > 0 && (
                            <section className="bg-white rounded-2xl p-6 md:p-10 border border-gray-100 shadow-xl animate-fade-in">
                                <SectionHeading>By Day {sprint.duration}, You'll Have:</SectionHeading>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 mt-6">
                                    {sprint.outcomes.map((outcome, i) => (
                                        <div key={i} className="flex items-start gap-4 group">
                                            <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                                                ✓
                                            </div>
                                            <p className="font-bold text-gray-700 leading-snug text-[12px]">{outcome}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="py-12 text-center border-t border-gray-100">
                            <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-6">The Outcome</p>
                            <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-6 px-4 italic">
                                <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                            </h3>
                        </section>
                    </div>

                    <aside className="lg:col-span-4 space-y-4">
                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-md lg:sticky lg:top-6">
                            <div className="text-center mb-6">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Price</p>
                                <h3 className="text-2xl font-black text-dark tracking-tighter italic leading-none">
                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                </h3>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-lg">📅</span>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase">Duration</p>
                                        <p className="text-[10px] font-bold text-gray-900">{sprint.duration} Continuous Days</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-lg">⚡</span>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase">Protocol</p>
                                        <p className="text-[10px] font-bold text-gray-900">{sprint.protocol || 'One action per day'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Button 
                                    onClick={handleJoinClick} 
                                    className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[9px] uppercase tracking-widest font-black"
                                >
                                    Secure My Path
                                </Button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col items-center text-center">
                                <img src={sprintCoach.profileImageUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md mb-3" />
                                <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-1">Guided By</p>
                                <h4 className="text-[12px] font-black text-dark tracking-tight leading-none mb-1">{sprintCoach.name}</h4>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{sprintCoach.niche}</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden group shadow-lg">
                            <div className="relative z-10">
                                <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-3">Commitment</p>
                                <p className="text-[11px] font-medium italic leading-relaxed opacity-90">
                                    "A complete shift in my professional value. The direct feedback was the catalyst I needed."
                                </p>
                                <p className="mt-4 font-bold text-[8px] uppercase tracking-widest text-white/40">Jamie L.</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/20 rounded-full blur-2xl"></div>
                        </div>
                    </aside>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;