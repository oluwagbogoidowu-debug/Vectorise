
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Participant } from '../../types';
import ProgressBar from '../../components/ProgressBar';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';

const MySprints: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [allSprints, setAllSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isQueuedExpanded, setIsQueuedExpanded] = useState(false);
    const [isWaitlistExpanded, setIsWaitlistExpanded] = useState(false);
    const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        // 1. Subscribe to enrollments in real-time
        const unsubEnrollments = sprintService.subscribeToUserEnrollments(user.id, (data) => {
            setEnrollments(data);
        });

        // 2. Subscribe to ALL active sprints for real-time metadata syncing (like unique images)
        // This ensures if a coach updates an image, it reflects on the enrollment card immediately.
        const unsubSprints = sprintService.subscribeToAdminSprints((data) => {
            setAllSprints(data);
            setIsLoading(false);
        });

        return () => {
            unsubEnrollments();
            unsubSprints();
        };
    }, [user?.id]);

    const categorized = useMemo(() => {
        const enriched = enrollments.map(enrol => {
            const sprint = allSprints.find(s => s.id === enrol.sprint_id);
            return sprint ? { enrollment: enrol, sprint } : null;
        }).filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => item !== null);

        const inProgress = enriched.filter(e => e.enrollment.progress.some(p => !p.completed));
        const archived = enriched.filter(e => e.enrollment.progress.every(p => p.completed));

        const p = user as Participant;
        const activeIds = new Set(enriched.map(e => e.sprint.id));
        
        const queued = (p.savedSprintIds || [])
            .filter(id => !activeIds.has(id))
            .map(id => allSprints.find(s => s.id === id))
            .filter((s): s is Sprint => !!s);

        const waitlist = (p.wishlistSprintIds || [])
            .filter(id => !activeIds.has(id) && !(p.savedSprintIds || []).includes(id))
            .map(id => allSprints.find(s => s.id === id))
            .filter((s): s is Sprint => !!s);

        return { inProgress, archived, queued, waitlist };
    }, [enrollments, allSprints, user]);

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
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-light">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Synchronizing Journey...</p>
            </div>
        );
    }

    const { inProgress, archived, queued, waitlist } = categorized;
    const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

    return (
        <div className="h-screen w-full bg-light flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-5 flex-shrink-0 bg-white border-b border-gray-100">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">My Journey</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 custom-scrollbar">
                <div className="max-w-screen-lg mx-auto w-full">
                    {/* 1. IN PROGRESS */}
                    <section className="mb-10">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">In Progress</h2>
                        {inProgress.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {inProgress.map(({ enrollment, sprint }) => {
                                    const progress = calculateProgress(enrollment);
                                    return (
                                        <Link key={enrollment.id} to={`/participant/sprint/${enrollment.id}`} className="block group">
                                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4">
                                                <div className="w-full sm:w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-inner bg-gray-50">
                                                    <img 
                                                        src={sprint.coverImageUrl || fallbackUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                                        onError={(e) => { e.currentTarget.src = fallbackUrl }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-[8px] font-black text-primary uppercase tracking-widest">{sprint.category}</p>
                                                        <span className="text-[10px] font-bold text-gray-400">{progress.toFixed(0)}%</span>
                                                    </div>
                                                    <h3 className="text-sm font-black text-gray-900 mb-0.5 truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                                    {sprint.subtitle && <p className="text-[9px] font-bold text-gray-400 uppercase italic mb-2 truncate">{sprint.subtitle}</p>}
                                                    <ProgressBar value={progress} />
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Day {enrollment.progress.filter(p => p.completed).length + 1} / {sprint.duration}</p>
                                                        <button className="text-[8px] font-black text-primary uppercase tracking-widest group-hover:underline">Resume &rarr;</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-gray-400 mb-4 font-medium text-xs">No active programs.</p>
                                <Link to="/discover">
                                    <Button className="rounded-xl px-6 py-2 text-[9px] font-black uppercase tracking-widest">Find a Path</Button>
                                </Link>
                            </div>
                        )}
                    </section>

                    {/* 2. UPCOMING QUEUE */}
                    {queued.length > 0 && (
                        <section className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Upcoming Queue</h2>
                                <div className="h-px bg-gray-100 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {(isQueuedExpanded ? queued : queued.slice(0, 2)).map((sprint, idx) => (
                                    <div key={sprint.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 hover:shadow-sm transition-all group animate-fade-in">
                                        <Link to={`/sprint/${sprint.id}`} className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50">
                                                <img 
                                                    src={sprint.coverImageUrl || fallbackUrl} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                                    alt="" 
                                                    onError={(e) => { e.currentTarget.src = fallbackUrl }}
                                                />
                                            </div>
                                        </Link>
                                        <Link to={`/sprint/${sprint.id}`} className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 text-[12px] truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{sprint.duration} Days • {sprint.category}</p>
                                        </Link>
                                        <div className="flex items-center gap-1">
                                            <div className="flex flex-col gap-0.5 mr-1">
                                                <button onClick={(e) => { e.preventDefault(); handleReorder(idx, 'up'); }} disabled={idx === 0} className={`p-1 rounded-md border transition-all ${idx === 0 ? 'opacity-20 cursor-not-allowed border-gray-50' : 'text-primary border-primary/5 hover:bg-primary/5 active:scale-90'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); handleReorder(idx, 'down'); }} disabled={idx === queued.length - 1} className={`p-1 rounded-md border transition-all ${idx === queued.length - 1 ? 'opacity-20 cursor-not-allowed border-gray-50' : 'text-primary border-primary/5 hover:bg-primary/5 active:scale-90'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                            </div>
                                            <Link to={`/sprint/${sprint.id}`} className="p-2 text-gray-300 hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {queued.length > 2 && (
                                <button 
                                    onClick={() => setIsQueuedExpanded(!isQueuedExpanded)}
                                    className="mt-3 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[8px] rounded-lg border border-gray-100 transition-all"
                                >
                                    {isQueuedExpanded ? 'Collapse' : `See More (${queued.length - 2})`}
                                </button>
                            )}
                        </section>
                    )}

                    {/* 3. SAVED / BOOKMARKED */}
                    {waitlist.length > 0 && (
                        <section className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Saved for Later</h2>
                                <div className="h-px bg-gray-100 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {(isWaitlistExpanded ? waitlist : waitlist.slice(0, 2)).map((sprint) => (
                                    <div key={sprint.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 hover:shadow-sm transition-all group animate-fade-in">
                                        <Link to={`/sprint/${sprint.id}`} className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50">
                                                <img 
                                                    src={sprint.coverImageUrl || fallbackUrl} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                                    alt="" 
                                                    onError={(e) => { e.currentTarget.src = fallbackUrl }}
                                                />
                                            </div>
                                        </Link>
                                        <Link to={`/sprint/${sprint.id}`} className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 text-[12px] truncate group-hover:text-primary transition-colors">{sprint.title}</h3>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{sprint.duration} Days • {sprint.category}</p>
                                        </Link>
                                        <button 
                                            onClick={() => handleRemoveFromWaitlist(sprint.id)}
                                            className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                                            title="Remove from saved"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {waitlist.length > 2 && (
                                <button 
                                    onClick={() => setIsWaitlistExpanded(!isWaitlistExpanded)}
                                    className="mt-3 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[8px] rounded-lg border border-gray-100 transition-all"
                                >
                                    {isWaitlistExpanded ? 'Collapse' : `See More (${waitlist.length - 2})`}
                                </button>
                            )}
                        </section>
                    )}

                    {/* 4. GROWTH ARCHIVES */}
                    {archived.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Archives</h2>
                                <div className="h-px bg-gray-100 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {(isArchivedExpanded ? archived : archived.slice(0, 2)).map(({ enrollment, sprint }) => (
                                    <div key={enrollment.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-4 group animate-fade-in">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50">
                                            <img 
                                                src={sprint.coverImageUrl || fallbackUrl} 
                                                className="w-full h-full object-cover" 
                                                alt="" 
                                                onError={(e) => { e.currentTarget.src = fallbackUrl }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-700 text-[12px] truncate">{sprint.title}</h3>
                                            <span className="text-[7px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-green-100">Mastered</span>
                                        </div>
                                        <Link to={`/participant/sprint/${enrollment.id}`} className="p-2 text-gray-300 hover:text-primary transition-colors" title="Review">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            {archived.length > 2 && (
                                <button 
                                    onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                                    className="mt-3 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[8px] rounded-lg border border-gray-100 transition-all"
                                >
                                    {isArchivedExpanded ? 'Collapse' : `See More (${archived.length - 2})`}
                                </button>
                            )}
                        </section>
                    )}
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MySprints;
