
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, Sprint, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
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
        <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
            <div className="max-w-screen-lg mx-auto px-4 pt-4">
                
                <div className="flex justify-between items-center mb-5">
                    <button 
                        onClick={() => navigate('/discover')} 
                        className="group flex items-center text-gray-400 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registry
                    </button>
                    <div className="px-4 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest">
                        {isFoundational ? 'FOUNDATIONAL PATH' : 'REGISTRY PATH'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <div className="lg:col-span-8 space-y-6">
                        
                        <div className="relative h-[260px] sm:h-[320px] lg:h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl group border-4 border-white">
                            <img 
                                src={sprint.coverImageUrl} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                alt={sprint.title} 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
                            <div className="absolute bottom-10 left-10 right-10 text-white">
                                <div className="mb-4">
                                    <span className="px-3 py-1.5 bg-[#0E7850] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                                        {isFoundational ? 'FOUNDATIONAL PATH' : 'PREMIUM SPRINT'}
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1] mb-3 italic">
                                    <FormattedText text={sprint.title} />
                                </h1>
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.4em]">{sprint.duration} DAY PROTOCOL</p>
                            </div>
                        </div>

                        {/* Transformation Section - Normalized Sizes, No Italics */}
                        <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm animate-fade-in relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <SectionHeading>The Transformation</SectionHeading>
                                    {sprint.outcomeTag && (
                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic">{sprint.outcomeTag}</span>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    <p className="text-gray-900 font-bold text-sm leading-relaxed">
                                        <FormattedText text={sprint.transformation || sprint.description} />
                                    </p>
                                    
                                    <div className="h-px bg-gray-100 w-24"></div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {sprint.forWho && sprint.forWho.length > 0 && (
                                            <div>
                                                <h4 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                   <span className="w-1 h-3 bg-primary rounded-full"></span>
                                                   Ideal For You If
                                                </h4>
                                                <ul className="space-y-3">
                                                    {sprint.forWho.map((item, i) => (
                                                        <li key={i} className="flex gap-3 items-start">
                                                            <span className="text-primary mt-1 flex-shrink-0">
                                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                            </span>
                                                            <p className="text-sm italic font-semibold text-gray-600 leading-snug">{item}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {sprint.notForWho && sprint.notForWho.length > 0 && (
                                            <div>
                                                <h4 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                  <span className="w-1 h-3 bg-red-400 rounded-full"></span>
                                                  Not For You If
                                                </h4>
                                                <ul className="space-y-3 opacity-60">
                                                    {sprint.notForWho.map((item, i) => (
                                                        <li key={i} className="flex gap-3 items-start">
                                                            <span className="text-red-400 mt-1 flex-shrink-0">
                                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </span>
                                                            <p className="text-sm font-semibold text-gray-500 leading-snug">{item}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* How This Sprint Works - Green Background */}
                        {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                            <section className="bg-primary text-white rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden shadow-2xl border border-white/5 group">
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48 opacity-60"></div>
                                
                                <div className="relative z-10">
                                    <SectionHeading color="white/40">How This Sprint Works</SectionHeading>
                                    
                                    <div className="mt-6 space-y-10">
                                        <p className="text-2xl md:text-4xl font-black text-white italic tracking-tighter leading-[1.1] mb-12">
                                            For {sprint.duration} days, you’ll complete one <span className="text-[#0FB881]">focused action</span> per day.
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {sprint.methodSnapshot.map((item, i) => (
                                                <div key={i} className="space-y-3 group/item">
                                                    <div className="flex items-center gap-3">
                                                      <span className="text-[10px] font-black text-white/20 italic">0{i+1}</span>
                                                      <p className="text-white font-black uppercase text-[11px] tracking-[0.25em]">
                                                          {item.verb}
                                                      </p>
                                                    </div>
                                                    <p className="text-white/70 text-[12px] font-medium leading-relaxed italic transition-colors">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-center text-primary font-black uppercase tracking-[0.4em] text-[10px] pt-12 border-t border-white/5 opacity-60 mt-12">
                                        Real breakthroughs emerge from what you do.
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Outcomes Section - Moderate Sizing */}
                        {sprint.outcomes && sprint.outcomes.length > 0 && (
                            <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl animate-fade-in relative overflow-hidden">
                                <SectionHeading>Evidence of Completion</SectionHeading>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-10">By Day {sprint.duration}, You'll Have:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 relative z-10">
                                    {sprint.outcomes.map((outcome, i) => (
                                        <div key={i} className="flex items-start gap-4 group">
                                            <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-[9px] shadow-lg">
                                                ✓
                                            </div>
                                            <p className="font-black text-gray-800 leading-tight text-xs italic">{outcome}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="py-12 text-center border-t border-gray-100">
                            <SectionHeading>The Outcome</SectionHeading>
                            <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-[1.15] tracking-tighter px-4 italic max-w-xl mx-auto">
                                <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                            </h3>
                        </section>
                    </div>

                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl lg:sticky lg:top-6 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20"></div>
                            
                            <div className="text-center mb-10">
                                <SectionHeading>Registry Status</SectionHeading>
                                <h3 className="text-2xl font-black text-dark tracking-tighter italic leading-none">
                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                </h3>
                            </div>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[1.25rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">📅</div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Timeline</p>
                                        <p className="text-[11px] font-black text-gray-900 leading-none">{sprint.duration} Continuous Days</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[1.25rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">⚡</div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Execution</p>
                                        <p className="text-[11px] font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Button 
                                    onClick={handleJoinClick} 
                                    className="w-full py-4 rounded-[1.25rem] shadow-2xl shadow-primary/30 text-[10px] uppercase tracking-[0.2em] font-black"
                                >
                                    Authorize Path &rarr;
                                </Button>
                            </div>

                            <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col items-center text-center">
                                <img src={sprintCoach.profileImageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-xl mb-4" />
                                <SectionHeading>Guided By</SectionHeading>
                                <h4 className="text-base font-black text-dark tracking-tight leading-none mb-1">{sprintCoach.name}</h4>
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">{sprintCoach.niche}</p>
                            </div>
                        </div>

                        <div className="bg-dark rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl border border-white/5">
                            <div className="relative z-10">
                                <SectionHeading color="primary">Commitment</SectionHeading>
                                <p className="text-sm font-medium italic leading-relaxed opacity-90 mb-8">
                                    "A complete shift in my professional value. The direct feedback was the catalyst I needed."
                                </p>
                                <div className="flex items-center gap-3">
                                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                                  <p className="font-black text-[9px] uppercase tracking-widest text-white/40">Jamie L. • Graduate</p>
                                </div>
                            </div>
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
