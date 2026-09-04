import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coach, Sprint, Participant, ParticipantSprint, LifecycleSlotAssignment, Track, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { trackService } from '../../services/trackService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';
import { Sparkles, Lock, Loader2 } from 'lucide-react';
import { filterAllowedSprintsForUser, getExploreSprintItems, ExploreSprintItem, isSprintRerun } from '../../utils/sprintUtils';

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
    <div className="flex-shrink-0 w-[85%] md:w-72 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-8 flex flex-col relative overflow-hidden group opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
        <div className="relative z-10">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">"{desc}"</p>
            
            <div className="flex flex-wrap gap-2 mb-8">
                {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-400 text-[8px] font-bold rounded-md border border-gray-100 dark:border-zinc-700">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-50 dark:border-zinc-800 flex items-center gap-2">
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
    const [allSprints, setAllSprints] = useState<Sprint[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [sprintLinks, setSprintLinks] = useState<any[]>([]);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isSprintsLoaded, setIsSprintsLoaded] = useState(false);
    const [isOtherDataLoaded, setIsOtherDataLoaded] = useState(false);
    const [isEnrollmentsLoaded, setIsEnrollmentsLoaded] = useState(false);

    const isLoading = !isSprintsLoaded || !isOtherDataLoaded || !isEnrollmentsLoaded;

    useEffect(() => {
        if (user && !userService.isIdentitySet(user as Participant)) {
            navigate('/participant-dashboard');
            toast.error("Explore Locked", {
                description: "Set your identity in your profile to unlock the Explore page.",
                action: {
                    label: "Set Identity",
                    onClick: () => navigate('/profile/settings/identity')
                }
            });
        }
    }, [user, navigate]);

    useEffect(() => {
        // Subscribe to published sprints in real-time
        const unsubSprints = sprintService.subscribeToPublishedSprints((data) => {
            const nonIgnite = data.filter(s => s.contentType !== 'ignite');
            setAllSprints(nonIgnite);
            const allowedSprints = filterAllowedSprintsForUser(nonIgnite, user);
            setSprints(allowedSprints);
            setIsSprintsLoaded(true);
        }, (error) => {
            console.error("Error subscribing to sprints:", error);
            setIsSprintsLoaded(true);
        });

        // Subscribe to sprint links in real-time so changes in Orchestrator reflect immediately
        const unsubLinks = sprintService.subscribeToSprintLinks((links) => {
            setSprintLinks(links || []);
        });

        const loadCoaches = async () => {
            try {
                const dbCoaches = await userService.getCoaches().catch(() => []);
                setCoaches(dbCoaches);
            } catch (err) {
                console.error("Error loading coaches:", err);
            } finally {
                setIsOtherDataLoaded(true);
            }
        };
        
        loadCoaches();
        return () => {
            unsubSprints();
            unsubLinks();
        };
    }, [user]);

    // Subscribe to enrollments for reactive filtering of "Active" sprints
    useEffect(() => {
        if (!user) {
            setUserEnrollments([]);
            setIsEnrollmentsLoaded(true);
            return;
        }
        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, (data) => {
            setUserEnrollments(data);
            setIsEnrollmentsLoaded(true);
        });
        return () => unsubscribe();
    }, [user]);

    // Identify all sprints that are currently in progress or have been finished/completed
    const enrolledSprintIds = useMemo(() => {
        return new Set(userEnrollments.map(e => e.sprint_id));
    }, [userEnrollments]);

    // Strict Sprint-to-Sprint linking traversal
    const exploreItems = useMemo(() => {
        return getExploreSprintItems(sprints, user, enrolledSprintIds, userEnrollments, sprintLinks, undefined, allSprints);
    }, [sprints, allSprints, user, enrolledSprintIds, userEnrollments, sprintLinks]);

    const level1Items = useMemo(() => {
        return exploreItems.filter(item => item.level === 1 && item.isClickable);
    }, [exploreItems]);

    const level2PlusItems = useMemo(() => {
        return exploreItems.filter(item => item.level > 1 || !item.isClickable);
    }, [exploreItems]);

    if (isLoading) {
        return (
            <div className="h-full w-full min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] dark:bg-zinc-950 p-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                    Loading recommendations...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto bg-[#FDFDFD] dark:bg-zinc-950 custom-scrollbar selection:bg-primary/10">
            <div className="max-w-screen-md mx-auto px-6 py-12 pb-40 animate-fade-in">
                
                {/* HEADER */}
                <header className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-3">
                        Explore What’s Next
                    </h1>
                </header>

                {/* SECTION 1: LEVEL 1 ACTIVE SPRINTS (First-Level Direct Links & Clicked Superior Links) */}
                {level1Items.length > 0 && (
                    <section className="mb-16">
                        <div className="mb-6 px-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em]">
                                    {level1Items[0]?.isSuperior ? "Top Recommendation" : "Your next sprint"}
                                </h2>
                                <Sparkles className="w-3 h-3 text-primary" />
                                {level1Items[0]?.isSuperior && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[7px] font-black uppercase tracking-widest">
                                        Matched Choice
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-6 px-2">
                            {level1Items.map((item, index) => (
                                <React.Fragment key={item.sprint.id}>
                                    {index === 1 && (
                                        <div className="pt-6 pb-2">
                                            <h2 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em]">
                                                Other recommended sprints
                                            </h2>
                                        </div>
                                    )}
                                    <SprintCard 
                                        sprint={item.sprint} 
                                        coach={coaches.find(c => c.id === item.sprint.coachId) || ({} as Coach)} 
                                        level={1}
                                        isInactive={false}
                                        isRerun={isSprintRerun(item.sprint.id, user, userEnrollments)}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 2: LEVEL 2+ INACTIVE SPRINTS (Second-Level Links and Beyond) */}
                {level2PlusItems.length > 0 && (
                    <section className="mb-16">
                        <div className="mb-6 px-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.4em]">
                                    Upcoming Sprints (Next Level)
                                </h2>
                                <Lock className="w-3 h-3 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                                Connected to your path • Unlocks after completing previous sprints
                            </p>
                        </div>
                        
                        <div className="space-y-6 px-2">
                            {level2PlusItems.map((item) => (
                                <SprintCard 
                                    key={item.sprint.id}
                                    sprint={item.sprint} 
                                    coach={coaches.find(c => c.id === item.sprint.coachId) || ({} as Coach)} 
                                    level={item.level}
                                    isInactive={true}
                                    inactiveLabel={`Level ${item.level} • Inactive`}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* EMPTY STATE IF NO LINKED SPRINTS EXIST YET */}
                {level1Items.length === 0 && level2PlusItems.length === 0 && (
                    <div className="mb-16 p-8 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2rem] text-center animate-fade-in">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
                            No New Sprints In Your Path Right Now
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                            Complete your active sprint moves or check back soon as new interconnected sprint paths are configured.
                        </p>
                    </div>
                )}

                {/* PROFILE SETUP PROMPT */}
                {user && user.role === UserRole.PARTICIPANT && (!(user as Participant).growthAreas?.length || !(user as Participant).risePathway) && (
                    <div className="mb-12 p-6 bg-primary/5 border border-primary/10 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">Complete your profile setup</p>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">Earn coins to start your first sprint</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/profile')}
                            className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            Setup Profile &rarr;
                        </button>
                    </div>
                )}

                {/* SECTION 3: THE FUTURE TRACK */}
                <section className="mb-20">
                    <div className="mb-6 px-2">
                        <h2 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em] mb-1">What comes after this</h2>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">You’ll unlock these as you progress.</p>
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
                <footer className="text-center pt-10 border-t border-gray-50 dark:border-zinc-800">
                    <p className="text-lg text-gray-300 dark:text-zinc-600 font-medium">You’re not behind.</p>
                    <p className="text-lg text-gray-400 dark:text-zinc-400 font-black">You’re building in order.</p>
                    
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
