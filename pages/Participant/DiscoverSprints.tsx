
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coach, Sprint, Participant, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';

/**
 * MINI SPRINT CARD (Internal)
 * Used for "Other ways to move forward" section
 */
const MiniSprintCard: React.FC<{ sprint: Sprint; coach: Coach }> = ({ sprint, coach }) => (
    <Link to={`/sprint/${sprint.id}`} className="flex-shrink-0 w-64 group">
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col transition-all hover:shadow-md active:scale-[0.98]">
            <div className="relative h-32 overflow-hidden">
                <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[7px] font-black text-primary uppercase tracking-widest shadow-sm">
                    {sprint.duration} Days
                </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
                <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest mb-1">{sprint.category}</p>
                <h4 className="text-sm font-black text-gray-900 leading-tight mb-4 line-clamp-2">{sprint.title}</h4>
                
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={coach.profileImageUrl} className="w-6 h-6 rounded-lg object-cover" alt="" />
                        <span className="text-[9px] font-bold text-gray-500 truncate max-w-[80px]">{coach.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                        {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : 'View Sprint'}
                    </span>
                </div>
            </div>
        </div>
    </Link>
);

/**
 * LOCKED STAGE CARD (Internal)
 * Used for "The Future Track" section
 */
const LockedStageCard: React.FC<{ 
    title: string; 
    desc: string; 
    tags: string[]; 
    unlockCondition: string 
}> = ({ title, desc, tags, unlockCondition }) => (
    <div className="flex-shrink-0 w-72 bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col relative overflow-hidden group opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
        <div className="relative z-10">
            <h3 className="text-xl font-black text-gray-900 mb-2 italic">{title}</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 italic">"{desc}"</p>
            
            <div className="flex flex-wrap gap-2 mb-8">
                {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-400 text-[8px] font-bold rounded-md border border-gray-100">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center gap-2">
                <span className="text-sm">🔒</span>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{unlockCondition}</p>
            </div>
        </div>
    </div>
);

const DiscoverSprints: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDiscoveryData = async () => {
            setIsLoading(true);
            try {
                const [publishedSprints, dbCoaches] = await Promise.all([
                    sprintService.getPublishedSprints(),
                    userService.getCoaches()
                ]);
                setSprints(publishedSprints);
                setCoaches(dbCoaches);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDiscoveryData();
    }, []);

    // 1. Recommended: Find the primary Foundation sprint
    const recommendedSprint = useMemo(() => {
        return sprints.find(s => s.category === 'Growth Fundamentals' || s.category === 'Core Platform Sprint') || sprints[0];
    }, [sprints]);

    const recommendedCoach = useMemo(() => {
        if (!recommendedSprint) return null;
        return coaches.find(c => c.id === recommendedSprint.coachId) || {
            name: 'Vectorise',
            profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
        } as Coach;
    }, [recommendedSprint, coaches]);

    // 2. Other Options: Sprints in same stage pool (Max 3, mix of paid/coin)
    const otherOptions = useMemo(() => {
        if (!recommendedSprint) return [];
        return sprints
            .filter(s => s.id !== recommendedSprint.id)
            .slice(0, 3);
    }, [sprints, recommendedSprint]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-light">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto bg-[#FDFDFD] custom-scrollbar selection:bg-primary/10">
            <div className="max-w-screen-md mx-auto px-6 py-12 pb-40 animate-fade-in">
                
                {/* HEADER */}
                <header className="mb-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic mb-3">
                        Explore What’s Next
                    </h1>
                    <div className="space-y-1">
                        <p className="text-lg text-gray-500 font-medium italic">You don’t need to do everything.</p>
                        <p className="text-lg text-gray-900 font-bold italic">Just the next right thing.</p>
                    </div>
                </header>

                {/* SECTION 1: RECOMMENDED */}
                {recommendedSprint && (
                    <section className="mb-16">
                        <div className="mb-6 px-2">
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Recommended for you</h2>
                            <p className="text-xs text-gray-400 font-medium italic">Based on where you are right now.</p>
                        </div>

                        <Link to={`/sprint/${recommendedSprint.id}`} className="block group">
                            <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden transition-all duration-700 hover:shadow-2xl hover:-translate-y-1">
                                <div className="relative h-64 overflow-hidden">
                                    <img src={recommendedSprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="" />
                                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-primary shadow-lg uppercase tracking-widest">
                                        {recommendedSprint.duration} Days
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark/60 via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-6 left-8">
                                        <span className="px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">Foundational</span>
                                    </div>
                                </div>
                                
                                <div className="p-8 md:p-10">
                                    <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight group-hover:text-primary transition-colors italic">
                                        {recommendedSprint.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed italic mb-8">"{recommendedSprint.description}"</p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-6 items-center justify-between pt-6 border-t border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <img src={recommendedCoach?.profileImageUrl} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm ring-1 ring-gray-100" alt="" />
                                            <div>
                                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Guided By</p>
                                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{recommendedCoach?.name}</p>
                                            </div>
                                        </div>
                                        <button className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 active:scale-95 transition-all">
                                            Start this sprint &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </section>
                )}

                {/* SECTION 2: OTHER OPTIONS */}
                {otherOptions.length > 0 && (
                    <section className="mb-16">
                        <div className="mb-6 px-2">
                            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">Other ways to move forward</h2>
                            <p className="text-xs text-gray-400 font-medium italic">Different paths. Same stage.</p>
                        </div>
                        
                        <div className="flex gap-5 overflow-x-auto pb-8 no-scrollbar px-2 -mx-2">
                            {otherOptions.map(s => (
                                <MiniSprintCard 
                                    key={s.id} 
                                    sprint={s} 
                                    coach={coaches.find(c => c.id === s.coachId) || ({} as Coach)} 
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 3: THE FUTURE TRACK */}
                <section className="mb-20">
                    <div className="mb-6 px-2">
                        <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">What comes after this</h2>
                        <p className="text-xs text-gray-400 font-medium italic">You’ll unlock these as you progress.</p>
                    </div>

                    <div className="flex gap-5 overflow-x-auto pb-8 no-scrollbar px-2 -mx-2">
                        <LockedStageCard 
                            title="Proof"
                            desc="Show evidence of what you can do."
                            tags={['Career', 'Professional Development', 'Leadership', 'Executive Development']}
                            unlockCondition="Unlocks after Execution"
                        />
                        <LockedStageCard 
                            title="Positioning"
                            desc="Clarify how others see your value."
                            tags={['Communication', 'Interpersonal Skills', 'Boundaries', 'Conflict Resolution', 'Connection']}
                            unlockCondition="Unlocks after Proof"
                        />
                        <LockedStageCard 
                            title="Stability"
                            desc="Turn progress into something dependable."
                            tags={['Business', 'Entrepreneurship', 'Startup', 'Founder']}
                            unlockCondition="Unlocks after Positioning"
                        />
                        <LockedStageCard 
                            title="Expansion"
                            desc="Scale what’s already working."
                            tags={['Creativity', 'Life Transitions', 'Reinvention', 'Change']}
                            unlockCondition="Unlocks after Stability"
                        />
                    </div>
                </section>

                {/* FOOTER TEXT */}
                <footer className="text-center pt-10 border-t border-gray-50">
                    <p className="text-lg text-gray-300 font-medium italic">You’re not behind.</p>
                    <p className="text-lg text-gray-400 font-black italic">You’re building in order.</p>
                    
                    <div className="mt-16 flex justify-center opacity-10 grayscale">
                        <LocalLogo type="green" className="h-8 w-auto" />
                    </div>
                </footer>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DiscoverSprints;
