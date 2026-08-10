import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach, UserRole, LifecycleSlotAssignment } from '../../types';

export const StartHerePage: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const selectedFocus = location.state?.selectedFocus;
    const activeTrigger = location.state?.trigger || 'after_homepage';
    const allMatchedSprintIds = location.state?.allMatchedSprintIds || [];

    const initialSprintState = useMemo(() => {
        if (location.state?.sprint && (location.state.sprint.id === sprintId || !sprintId)) {
            return location.state.sprint;
        }
        if (sprintId) {
            try {
                const local = localStorage.getItem(`vectorise_sprint_cache_${sprintId}`);
                if (local) return JSON.parse(local);
            } catch (e) {}
        }
        return null;
    }, [location.state, sprintId]);

    const [sprint, setSprint] = useState<Sprint | null>(initialSprintState);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(!initialSprintState);
    const [resolvedId, setResolvedId] = useState<string | null>(sprintId || null);

    const vectoriseCoach: Coach = useMemo(() => ({
        id: 'vectorise',
        name: 'Vectorise',
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
        role: UserRole.COACH,
        email: 'hello@vectorise.life',
        niche: 'AI Growth',
        bio: 'Your guide to the Vectorise platform.',
        approved: true
    }), []);

    // Load or resolve sprint
    const loadSprint = useCallback(async (targetId: string) => {
        setIsLoading(true);
        try {
            let data = await sprintService.getSprintById(targetId);
            if (!data) {
                const adminSprints = await sprintService.getAdminSprints().catch(() => []);
                data = adminSprints.find(s => s.id === targetId) || null;
            }

            if (data) {
                setSprint(data);
                if (data.coachId) {
                    try {
                        const dbCoach = await userService.getUserDocument(data.coachId);
                        setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                    } catch (e) {
                        setFetchedCoach(vectoriseCoach);
                    }
                } else {
                    setFetchedCoach(vectoriseCoach);
                }
            } else {
                // Fallback to first available published sprint if missing
                const allPublished = await sprintService.getPublishedSprints().catch(() => []);
                if (allPublished.length > 0) {
                    setSprint(allPublished[0]);
                    setResolvedId(allPublished[0].id);
                }
            }
        } catch (err) {
            console.error("[StartHerePage] Error loading sprint:", err);
        } finally {
            setIsLoading(false);
        }
    }, [vectoriseCoach]);

    useEffect(() => {
        if (sprintId) {
            setResolvedId(sprintId);
            loadSprint(sprintId);
        } else {
            // Find default or foundational sprint
            sprintService.getPublishedSprints().then(published => {
                let target = published.find(s => s.sprintType === 'Foundational' || s.sprintType === 'Fundamentals' || s.sprintType === 'Core' || s.category === 'Growth Fundamentals');
                if (!target && published.length > 0) target = published[0];
                if (target) {
                    setSprint(target);
                    setResolvedId(target.id);
                    if (target.coachId) {
                        userService.getUserDocument(target.coachId)
                            .then(c => setFetchedCoach((c as Coach) || vectoriseCoach))
                            .catch(() => setFetchedCoach(vectoriseCoach));
                    }
                }
                setIsLoading(false);
            }).catch(() => setIsLoading(false));
        }
    }, [sprintId, loadSprint, vectoriseCoach]);

    // Handle orchestration realtime mapping if needed
    useEffect(() => {
        const unsub = sprintService.subscribeToOrchestration((mapping) => {
            const orchestrationMapping = mapping as Record<string, LifecycleSlotAssignment>;
            if (selectedFocus && activeTrigger) {
                const slots = Object.entries(orchestrationMapping);
                let newlyResolvedId: string | null = null;

                const triggerEntry = slots.find(([_, val]) => val.stateTrigger === activeTrigger);
                if (triggerEntry && triggerEntry[1].sprintFocusMap) {
                    const matches = Object.keys(triggerEntry[1].sprintFocusMap).filter(
                        sId => triggerEntry[1].sprintFocusMap?.[sId]?.includes(selectedFocus)
                    );
                    if (matches.length > 0) newlyResolvedId = matches[0];
                }

                if (newlyResolvedId && newlyResolvedId !== resolvedId) {
                    setResolvedId(newlyResolvedId);
                    loadSprint(newlyResolvedId);
                }
            }
        });
        return () => unsub();
    }, [selectedFocus, activeTrigger, resolvedId, loadSprint]);

    const handleContinue = () => {
        const targetSprintId = sprint?.id || resolvedId || sprintId || 'default';
        navigate(`/onboarding/description/${targetSprintId}`, {
            state: {
                selectedFocus,
                trigger: activeTrigger,
                allMatchedSprintIds,
                sprint
            }
        });
    };

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-primary text-white relative overflow-hidden selection:bg-white/10">
            {/* Navigation Header */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-10 flex items-center justify-between pt-2">
                <button 
                    onClick={() => navigate('/onboarding/focus-selector', { state: { trigger: activeTrigger } })} 
                    className="group flex items-center text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Refine Focus
                </button>
                <LocalLogo type="white" className="h-5 w-auto opacity-40" />
            </header>

            {/* Main Content */}
            <main className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                        Start here
                    </h1>
                </div>

                <div className="w-full text-left">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                    ) : sprint ? (
                        <SprintCard 
                            sprint={sprint} 
                            coach={fetchedCoach || vectoriseCoach} 
                            isStatic={true} 
                            hideFooterDetails={true}
                            variant="glass"
                        />
                    ) : (
                        <div className="p-8 text-center bg-white/10 rounded-2xl border border-white/20">
                            <p className="text-xs font-bold text-white/80">Select a focus option to begin your sprint.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleContinue}
                    disabled={isLoading || !sprint}
                    className="w-full py-5 bg-white text-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                </button>
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-4 opacity-20 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em]">GET 1% BETTER DAILY</p>
            </footer>

            <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
    );
};

export default StartHerePage;
