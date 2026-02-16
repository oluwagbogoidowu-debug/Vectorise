
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coach, Sprint, Participant, ParticipantSprint, LifecycleSlotAssignment } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { CATEGORY_TO_STAGE_MAP, FOCUS_OPTIONS } from '../../services/mockData';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';

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
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [orchestration, setOrchestration] = useState<Record<string, LifecycleSlotAssignment>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDiscoveryData = async () => {
            setIsLoading(true);
            try {
                const [publishedSprints, dbCoaches, mapping] = await Promise.all([
                    sprintService.getPublishedSprints(),
                    userService.getCoaches(),
                    sprintService.getOrchestration() as Promise<Record<string, LifecycleSlotAssignment>>
                ]);
                
                setSprints(publishedSprints);
                setCoaches(dbCoaches);
                setOrchestration(mapping);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDiscoveryData();
    }, []);

    // Subscribe to enrollments for reactive filtering of "Active" sprints
    useEffect(() => {
        if (!user) {
            setUserEnrollments([]);
            return;
        }
        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, (data) => {
            setUserEnrollments(data);
        });
        return () => unsubscribe();
    }, [user]);

    // Identity the active sprint to exclude it from discovery
    // A sprint is active if it has incomplete tasks
    const activeSprintId = useMemo(() => {
        const active = userEnrollments.find(e => e.status === 'active' && e.progress.some(p => !p.completed));
        return active?.sprint_id;
    }, [userEnrollments]);

    // 1. Recommended Logic: Priority Slot Resolution based on User Focus
    const recommendedSprint = useMemo(() => {
        if (sprints.length === 0) return null;
        
        const participant = user as Participant;
        const userFocus = (participant?.onboardingAnswers as any)?.selected_focus || 
                         Object.values(participant?.onboardingAnswers || {}).find(val => FOCUS_OPTIONS.includes(String(val)));

        if (userFocus) {
            const prioritySlots = ['slot_found_clarity', 'slot_found_orient', 'slot_found_core'];
            for (const slotId of prioritySlots) {
                const mapping = orchestration[slotId];
                if (mapping) {
                    const focusMap = mapping.sprintFocusMap || {};
                    const matchedSprintId = Object.keys(focusMap).find(sId => focusMap[sId]?.includes(userFocus));
                    
                    if (matchedSprintId) {
                        const matchedSprint = sprints.find(s => s.id === matchedSprintId);
                        if (matchedSprint) return matchedSprint;
                    }

                    if (mapping.focusCriteria?.includes(userFocus)) {
                        const pool = mapping.sprintIds || (mapping.sprintId ? [mapping.sprintId] : []);
                        const matchedSprint = sprints.find(s => pool.includes(s.id));
                        if (matchedSprint) return matchedSprint;
                    }
                }
            }
        }

        const targetStage = participant?.currentStage || 'Direction';
        return sprints.find(s => 
            CATEGORY_TO_STAGE_MAP[s.category] === targetStage && 
            s.pricingType === 'cash'
        ) || sprints.find(s => s.pricingType === 'cash');
    }, [sprints, user, orchestration]);

    const recommendedCoach = useMemo(() => {
        if (!recommendedSprint) return null;
        return coaches.find(c => c.id === recommendedSprint.coachId) || {
            name: 'Vectorise',
            profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
        } as Coach;
    }, [recommendedSprint, coaches]);

    // 2. Other options: Filtered for active sprint and limited to 3
    const otherOptions = useMemo(() => {
        return sprints
            .filter(s => s.id !== recommendedSprint?.id && s.id !== activeSprintId)
            .slice(0, 3);
    }, [sprints, recommendedSprint, activeSprintId]);

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

                        <SprintCard 
                            sprint={recommendedSprint} 
                            coach={recommendedCoach as Coach} 
                        />
                    </section>
                )}

                {/* SECTION 2: OTHER OPTIONS (Horizontal Scroll, Max 3, no active) */}
                {otherOptions.length > 0 && (
                    <section className="mb-16">
                        <div className="mb-6 px-2">
                            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">Other options you can explore</h2>
                            <p className="text-xs text-gray-400 font-medium italic">Save for later to build your future waitlist (Max 3).</p>
                        </div>
                        
                        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar px-2 -mx-2 snap-x snap-mandatory">
                            {otherOptions.map(s => (
                                <div key={s.id} className="w-[320px] flex-shrink-0 snap-center">
                                    <SprintCard 
                                        sprint={s} 
                                        coach={coaches.find(c => c.id === s.coachId) || ({} as Coach)} 
                                    />
                                </div>
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
