
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Participant } from '../../types';
import ProgressBar from '../../components/ProgressBar';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';

const MySprints: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [inProgressSprints, setInProgressSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
    const [archivedSprints, setArchivedSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
    const [queuedSprints, setQueuedSprints] = useState<Sprint[]>([]);
    const [waitlistSprints, setWaitlistSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Expansion states for "See More" logic
    const [isQueuedExpanded, setIsQueuedExpanded] = useState(false);
    const [isWaitlistExpanded, setIsWaitlistExpanded] = useState(false);
    const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

    useEffect(() => {
        const loadSprints = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const enrollments = await sprintService.getUserEnrollments(user.id);
                const enriched = await Promise.all(enrollments.map(async (enrollment) => {
                    const sprint = await sprintService.getSprintById(enrollment.sprintId);
                    return sprint ? { enrollment, sprint } : null;
                }));

                const validEnrollments = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => item !== null);
                
                const inProgress = validEnrollments.filter(e => e.enrollment.progress.some(p => !p.completed));
                const mastered = validEnrollments.filter(e => e.enrollment.progress.every(p => p.completed));
                
                setInProgressSprints(inProgress);
                setArchivedSprints(mastered);

                const p = user as Participant;
                const savedIds = p.savedSprintIds || [];
                const wishlistIds = p.wishlistSprintIds || [];
                const activeOrMasteredIds = new Set(validEnrollments.map(ae => ae.sprint.id));

                const conflictingSavedIds = savedIds.filter(id => activeOrMasteredIds.has(id));
                let finalSavedIds = [...savedIds];
                
                if (conflictingSavedIds.length > 0) {
                    finalSavedIds = savedIds.filter(id => !activeOrMasteredIds.has(id));
                    await userService.updateUserDocument(user.id, { savedSprintIds: finalSavedIds });
                    await updateProfile({ savedSprintIds: finalSavedIds });
                }

                const saved = await Promise.all(finalSavedIds.map(id => sprintService.getSprintById(id)));
                setQueuedSprints(saved.filter((s): s is Sprint => s !== null));

                const filteredWaitlistIds = wishlistIds.filter(id => !activeOrMasteredIds.has(id) && !finalSavedIds.includes(id));
                const waitlisted = await Promise.all(filteredWaitlistIds.map(id => sprintService.getSprintById(id)));
                setWaitlistSprints(waitlisted.filter((s): s is Sprint => s !== null));

            } catch (err) {
                console.error("Error loading My Sprints:", err);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSprints();
    }, [user?.id]);

    const calculateProgress = (enrollment: ParticipantSprint) => {
        const completedDays = enrollment.progress.filter(p => p.completed).length;
        const totalDays = enrollment.progress.length;
        return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    };

    const handleReorder = async (index: number, direction: 'up' | 'down') => {
        if (!user) return;
        const p = user as Participant;
        const newIds = [...(p.savedSprintIds || [])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newIds.length) return;

        [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];

        try {
            const newQueuedSprints = [...queuedSprints];
            [newQueuedSprints[index], newQueuedSprints[targetIndex]] = [newQueuedSprints[targetIndex], newQueuedSprints[index]];
            setQueuedSprints(newQueuedSprints);

            await userService.updateUserDocument(user.id, { savedSprintIds: newIds });
            await updateProfile({ savedSprintIds: newIds });
        } catch (error) {
            console.error("Failed to reorder sprints:", error);
        }
    };

    const handleRemoveFromWaitlist = async (sprintId: string) => {
        if (!user) return;
        try {
            const p = user as Participant;
            const newWishlist = (p.wishlistSprintIds || []).filter(id => id !== sprintId);
            await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
            await updateProfile({ wishlistSprintIds: newWishlist });
            setWaitlistSprints(prev => prev.filter(s => s.id !== sprintId));
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Journey...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-32 animate-fade-in">
            <h1 className="text-3xl font-black mb-10 text-gray-900 tracking-tight">My Sprints</h1>

            {/* 1. IN PROGRESS - Always show all */}
            <section className="mb-14">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6">In Progress</h2>
                {inProgressSprints.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {inProgressSprints.map(({ enrollment, sprint }) => {
                            const progress = calculateProgress(enrollment);
                            return (
                                <Link key={enrollment.id} to={`/participant/sprint/${enrollment.id}`} className="block group">
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row gap-6">
                                        <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0">
                                            <img src={sprint.coverImageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{sprint.category}</p>
                                                <span className="text-xs font-bold text-gray-400">{progress.toFixed(0)}%</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors truncate">{sprint.title}</h3>
                                            <ProgressBar value={progress} />
                                            <div className="mt-4 flex items-center justify-between">
                                                <p className="text-xs text-gray-500 font-medium">Day {enrollment.progress.filter(p => p.completed).length + 1} of {sprint.duration}</p>
                                                <button className="text-[10px] font-black text-primary uppercase tracking-widest group-hover:underline">Resume &rarr;</button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 mb-6 font-medium text-sm">No active sprints today.</p>
                        <Link to="/discover">
                            <Button className="rounded-xl px-8 text-xs font-black uppercase tracking-widest">Discover Sprints</Button>
                        </Link>
                    </div>
                )}
            </section>

            {/* 2. UPCOMING QUEUE - Show 3 primarily */}
            <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Upcoming Queue</h2>
                    <div className="h-px bg-gray-100 flex-1"></div>
                </div>
                {queuedSprints.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            {(isQueuedExpanded ? queuedSprints : queuedSprints.slice(0, 3)).map((sprint, idx) => (
                                <div key={sprint.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 hover:shadow-sm transition-all group animate-fade-in">
                                    <Link to={`/sprint/${sprint.id}`} className="flex-shrink-0">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden">
                                            <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                        </div>
                                    </Link>
                                    <Link to={`/sprint/${sprint.id}`} className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{sprint.duration} Days • {sprint.category}</p>
                                    </Link>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <div className="flex flex-col gap-1 mr-2 sm:mr-4">
                                            <button onClick={(e) => { e.preventDefault(); handleReorder(idx, 'up'); }} disabled={idx === 0} className={`p-1.5 rounded-lg border transition-all ${idx === 0 ? 'opacity-20 cursor-not-allowed border-gray-100' : 'text-primary border-primary/10 hover:bg-primary/5 active:scale-90'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                            </button>
                                            <button onClick={(e) => { e.preventDefault(); handleReorder(idx, 'down'); }} disabled={idx === queuedSprints.length - 1} className={`p-1.5 rounded-lg border transition-all ${idx === queuedSprints.length - 1 ? 'opacity-20 cursor-not-allowed border-gray-100' : 'text-primary border-primary/10 hover:bg-primary/5 active:scale-90'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                        </div>
                                        <Link to={`/sprint/${sprint.id}`} className="p-3 text-gray-300 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {queuedSprints.length > 3 && (
                            <button 
                                onClick={() => setIsQueuedExpanded(!isQueuedExpanded)}
                                className="mt-4 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all border border-gray-100 active:scale-95"
                            >
                                {isQueuedExpanded ? 'Collapse List' : `See More (${queuedSprints.length - 3} Hidden)`}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="p-10 bg-gray-50/30 rounded-3xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-400 italic">No committed sprints in queue.</p>
                    </div>
                )}
            </section>

            {/* 3. GROWTH WAITLIST (BOOKMARKS) - Show 3 primarily */}
            <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Growth Waitlist</h2>
                    <div className="h-px bg-gray-100 flex-1"></div>
                </div>
                {waitlistSprints.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            {(isWaitlistExpanded ? waitlistSprints : waitlistSprints.slice(0, 3)).map((sprint) => (
                                <div key={sprint.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 hover:shadow-sm transition-all group animate-fade-in">
                                    <Link to={`/sprint/${sprint.id}`} className="flex-shrink-0">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden">
                                            <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                        </div>
                                    </Link>
                                    <Link to={`/sprint/${sprint.id}`} className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{sprint.duration} Days • {sprint.category}</p>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.preventDefault(); handleRemoveFromWaitlist(sprint.id); }} className="p-3 text-gray-300 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl" title="Remove from Waitlist">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        <Link to={`/sprint/${sprint.id}`} className="p-3 text-primary hover:bg-primary/5 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {waitlistSprints.length > 3 && (
                            <button 
                                onClick={() => setIsWaitlistExpanded(!isWaitlistExpanded)}
                                className="mt-4 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all border border-gray-100 active:scale-95"
                            >
                                {isWaitlistExpanded ? 'Collapse Waitlist' : `See More (${waitlistSprints.length - 3} Hidden)`}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="p-10 bg-gray-50/30 rounded-3xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-400 italic">Waitlist is clear. Save sprints from discovery to see them here.</p>
                    </div>
                )}
            </section>

            {/* 4. GROWTH ARCHIVES (MASTERED) - Show 3 primarily */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Growth Archives</h2>
                    <div className="h-px bg-gray-100 flex-1"></div>
                </div>
                {archivedSprints.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            {(isArchivedExpanded ? archivedSprints : archivedSprints.slice(0, 3)).map(({ enrollment, sprint }) => (
                                <div key={enrollment.id} className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-6 opacity-80 hover:opacity-100 transition-all group animate-fade-in">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                                        <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-700 text-sm truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                            <span className="text-[8px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-100">Mastered</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{sprint.duration} Days • Finished {new Date(enrollment.progress.find(p => p.day === sprint.duration)?.completedAt || '').toLocaleDateString()}</p>
                                    </div>
                                    <Link to={`/participant/sprint/${enrollment.id}`} className="p-3 text-gray-300 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl" title="Review Content">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    </Link>
                                </div>
                            ))}
                        </div>
                        {archivedSprints.length > 3 && (
                            <button 
                                onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                                className="mt-4 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all border border-gray-100 active:scale-95"
                            >
                                {isArchivedExpanded ? 'Collapse Archives' : `See More (${archivedSprints.length - 3} Hidden)`}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="p-10 bg-gray-50/30 rounded-3xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-400 italic">No mastered sprints yet. Complete your first cycle to start your archive.</p>
                    </div>
                )}
            </section>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MySprints;
