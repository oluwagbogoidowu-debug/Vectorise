
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Lock } from 'lucide-react';
import { Sprint, Coach, UserRole, Participant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_PARTICIPANT_SPRINTS } from '../services/mockData';
import { userService, sanitizeData } from '../services/userService';
import { assetService } from '../services/assetService';

interface SprintCardProps {
    sprint: Sprint;
    coach: Coach;
    forceShowOutcomeTag?: boolean; 
    isStatic?: boolean; // Disables navigation
    isInactive?: boolean; // Marks card as inactive (Level 2+ linked sprint)
    inactiveLabel?: string; // Optional custom inactive badge / button label
    level?: number; // Sprint linking level (e.g. 1 = direct, 2 = 2nd level)
    hideFooterDetails?: boolean; // Hide Guided By and Price/Coins section
    variant?: 'light' | 'dark' | 'glass';
    onOpenOverview?: () => void;
}

const SprintCard: React.FC<SprintCardProps> = ({ 
    sprint, 
    coach, 
    forceShowOutcomeTag = false, 
    isStatic = false, 
    isInactive = false,
    inactiveLabel,
    level,
    hideFooterDetails = false, 
    variant = 'light', 
    onOpenOverview 
}) => {
    const { user, updateProfile } = useAuth();
    const [isProcessingSave, setIsProcessingSave] = useState(false);

    const effectiveIsStatic = isStatic || isInactive;

    const isEnrolled = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.enrolledSprintIds?.includes(sprint.id) || MOCK_PARTICIPANT_SPRINTS.some(ps => ps.user_id === user.id && ps.sprint_id === sprint.id);
    }, [user, sprint.id]);

    const isQueued = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.savedSprintIds?.includes(sprint.id);
    }, [user, sprint.id]);

    const isSaved = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.wishlistSprintIds?.includes(sprint.id);
    }, [user, sprint.id]);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (effectiveIsStatic || !user || isProcessingSave || isQueued || isEnrolled) return;

        const p = user as Participant;
        const currentWishlist = p.wishlistSprintIds || [];
        const isCurrentlySaved = currentWishlist.includes(sprint.id);

        // ENFORCE WAITLIST LIMIT: Max 3 items
        if (!isCurrentlySaved && currentWishlist.length >= 3) {
            alert("Waitlist limit reached. You can only save up to 3 sprints for later.");
            return;
        }

        setIsProcessingSave(true);
        try {
            const newWishlist = isCurrentlySaved 
                ? currentWishlist.filter((id: string) => id !== sprint.id)
                : [...currentWishlist, sprint.id];

            await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
            await updateProfile(sanitizeData({ wishlistSprintIds: newWishlist }));
        } catch (err) {
            console.error("Save toggle error", err);
        } finally {
            setIsProcessingSave(false);
        }
    };

    const CardContainer = effectiveIsStatic ? 'div' : Link;
    const containerProps = effectiveIsStatic ? {} : { to: `/sprint/${sprint.id}`, state: { fromExplore: true } };

    const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

    const displayDescription = useMemo(() => {
        return sprint.description || sprint.subtitle || "No description available.";
    }, [sprint.description, sprint.subtitle]);

    const displayCoach = useMemo(() => {
        const isFoundational = sprint.sprintType === 'Foundational' || 
                              sprint.sprintType === 'Fundamentals' ||
                              sprint.sprintType === 'Core' ||
                              sprint.sprintType === 'Expert' ||
                              sprint.category === 'Growth Fundamentals' || 
                              sprint.category === 'Core Platform Sprint';
        
        if (isFoundational) {
            return {
                ...coach,
                name: 'Expert Coach',
                profileImageUrl: coach.profileImageUrl || 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
            };
        }
        
        if (!coach || !coach.name) {
            return {
                ...coach,
                name: 'Expert Coach',
                profileImageUrl: coach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE
            } as Coach;
        }
        
        return coach;
    }, [coach, sprint.sprintType, sprint.category]);

    if (variant === 'glass') {
        return (
            <div className="relative group h-full w-full">
                {!isEnrolled && !isQueued && !effectiveIsStatic && (
                    <button 
                        onClick={handleToggleSave}
                        disabled={isProcessingSave}
                        className={`absolute top-4 left-4 z-20 w-10 h-10 rounded-full backdrop-blur-xl transition-all duration-300 shadow-xl active:scale-90 flex items-center justify-center ${
                            isSaved 
                            ? 'bg-white text-primary scale-105' 
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        }`}
                        title={isSaved ? "Remove from waitlist" : "Save to waitlist"}
                    >
                        {isProcessingSave ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        )}
                    </button>
                )}

                <CardContainer 
                    {...(containerProps as any)} 
                    className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 sm:p-7 relative overflow-hidden shadow-2xl flex flex-col text-white transition-all duration-500 h-full group ${!effectiveIsStatic ? 'hover:bg-white/15 hover:border-white/30 cursor-pointer' : 'cursor-default'} ${isInactive ? 'opacity-85' : ''}`}
                >
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-5">
                            <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[8px] font-black uppercase tracking-widest">
                                {sprint.contentType === 'blog' ? 'RiseBlog' : 'Sprint'}
                            </span>
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                {sprint.category || 'Phase 02'}
                            </span>
                        </div>

                        <div className="mb-5 rounded-2xl overflow-hidden aspect-video border border-white/10 relative">
                            <img 
                                src={sprint.coverImageUrl || fallbackUrl} 
                                alt="" 
                                className={`w-full h-full object-cover opacity-80 transition-transform duration-700 ${!effectiveIsStatic ? 'group-hover:scale-105' : ''} ${isInactive ? 'grayscale' : ''}`} 
                                onError={(e) => { e.currentTarget.src = fallbackUrl; }} 
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black text-white/90 uppercase tracking-[0.2em] border border-white/10">
                                {sprint.duration} {sprint.duration === 1 ? 'Move' : 'Moves'}
                            </div>

                            {/* Inactive Level Badge */}
                            {isInactive && (
                                <div className="absolute top-3 left-3 bg-black/80 text-white border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg z-10 animate-fade-in">
                                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{inactiveLabel || (level ? `Level ${level} • Inactive` : 'Inactive • Locked')}</span>
                                </div>
                            )}

                            {!isInactive && forceShowOutcomeTag && sprint.outcomeTag && (
                                <div className="absolute top-3 left-3 bg-primary text-white px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest italic shadow-lg z-10 border border-white/20">
                                    {sprint.outcomeTag}
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black mb-2 leading-tight tracking-tight text-white">
                            {sprint.title}
                        </h3>

                        {sprint.subtitle && (
                            <p className="text-xs font-bold text-white/80 mb-4 leading-snug">
                                {sprint.subtitle}
                            </p>
                        )}

                        {!hideFooterDetails && (
                            <div className="pt-4 border-t border-white/10 mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <img src={displayCoach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/20" />
                                    <div>
                                        <p className="text-[6px] font-black text-white/40 uppercase tracking-widest">Guided By</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-tight">{displayCoach.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onOpenOverview && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onOpenOverview();
                                            }}
                                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all flex items-center justify-center border border-white/10 cursor-pointer"
                                            title="Sprint Overview"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <div className={`px-3 py-1.5 rounded-xl text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${isInactive ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-white/20'}`}>
                                        {isInactive ? (
                                            <><Lock className="w-3 h-3 text-amber-400" /> {inactiveLabel || "Locked"}</>
                                        ) : sprint.pricingType === 'credits' ? (
                                            `🪙 ${sprint.pointCost ?? 10}`
                                        ) : (
                                            `₦${(sprint.price ?? 1000).toLocaleString()}`
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContainer>
            </div>
        );
    }

    return (
        <div className="relative group h-full w-full">
            {/* Sophisticated Bookmark Toggle */}
            {!isEnrolled && !isQueued && !isStatic && (
                <button 
                    onClick={handleToggleSave}
                    disabled={isProcessingSave}
                    className={`absolute top-4 left-4 z-20 w-11 h-11 rounded-[1.25rem] backdrop-blur-xl transition-all duration-500 shadow-xl active:scale-90 flex items-center justify-center ${
                        isSaved 
                        ? 'bg-primary text-white scale-110' 
                        : 'bg-white/80 text-gray-400 hover:text-primary hover:bg-white border border-white/40'
                    }`}
                    title={isSaved ? "Remove from waitlist" : "Save to waitlist"}
                >
                    {isProcessingSave ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    )}
                </button>
            )}

            <CardContainer 
                {...(containerProps as any)} 
                className={`bg-white dark:bg-[#1c1c1e] rounded-[2rem] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 flex flex-col border border-gray-100/60 dark:border-zinc-800/80 overflow-hidden h-full group ${!effectiveIsStatic ? 'hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-2 cursor-pointer' : 'cursor-default'} ${isInactive ? 'opacity-85 dark:opacity-80' : ''}`}
            >
                <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    <img 
                        src={sprint.coverImageUrl || fallbackUrl} 
                        alt="" 
                        className={`w-full h-full object-cover transition-transform duration-1000 ${!effectiveIsStatic ? 'group-hover:scale-110 group-hover:rotate-1' : ''} ${isInactive ? 'grayscale-[20%]' : ''}`} 
                        onError={(e) => { e.currentTarget.src = fallbackUrl; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent transition-opacity duration-700 ${!effectiveIsStatic ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}></div>
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black text-primary shadow-lg uppercase tracking-[0.2em]">{sprint.duration} {sprint.duration === 1 ? 'Move' : 'Moves'}</div>
                    
                    {/* Inactive Level Badge */}
                    {isInactive && (
                        <div className="absolute top-3 left-3 bg-zinc-950/85 dark:bg-black/85 text-zinc-100 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg z-10 animate-fade-in">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            <span>{inactiveLabel || (level ? `Level ${level} • Inactive` : 'Inactive • Locked')}</span>
                        </div>
                    )}

                    {/* Archive Badge Preview */}
                    {!isInactive && forceShowOutcomeTag && sprint.outcomeTag && (
                         <div className="absolute top-3 left-3 bg-primary text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest italic shadow-lg z-10 animate-fade-in border border-white/20">
                            {sprint.outcomeTag}
                         </div>
                    )}

                    {isQueued && (
                        <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-[0.2em] shadow-lg">In Queue</div>
                    )}
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                    <h3 className={`text-lg font-black text-gray-900 dark:text-white mb-2 transition-colors leading-tight tracking-tight ${!effectiveIsStatic ? 'group-hover:text-primary' : ''}`}>{sprint.title}</h3>
                    {sprint.subtitle && (
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 mb-2 leading-snug">{sprint.subtitle}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700 text-gray-400 dark:text-zinc-400 text-[8px] font-black uppercase tracking-[0.25em]">
                            {sprint.contentType === 'blog' ? 'RiseBlog' : 'Sprint'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-primary/5 dark:bg-primary/20 border border-primary/10 dark:border-primary/30 text-primary dark:text-emerald-400 text-[8px] font-black uppercase tracking-[0.25em] truncate max-w-[150px]" title={sprint.category || "Fundamentals"}>
                            {sprint.category || "Fundamentals"}
                        </span>
                    </div>
                    
                    {!hideFooterDetails && (
                        <div className="pt-3 border-t border-gray-50 dark:border-zinc-800 mt-auto">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <img src={displayCoach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE} alt="" className="w-7 h-7 rounded-lg object-cover border-2 border-white dark:border-zinc-700 shadow-sm ring-1 ring-gray-100 dark:ring-zinc-800" />
                                    <div className="min-w-0">
                                        <p className="text-[6px] font-black text-gray-300 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Guided By</p>
                                        <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{displayCoach.name}</p>
                                    </div>
                                </div>
                                {onOpenOverview && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onOpenOverview();
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-zinc-800 hover:bg-primary/10 dark:hover:bg-primary/20 text-gray-400 dark:text-zinc-400 hover:text-primary dark:hover:text-emerald-400 transition-all flex items-center justify-center border border-gray-100 dark:border-zinc-700 cursor-pointer"
                                        title="Sprint Overview"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.25em] text-center shadow-sm transition-all duration-500 flex justify-center items-center gap-1.5 ${
                                isInactive
                                ? 'bg-gray-100 dark:bg-zinc-800/90 text-gray-400 dark:text-zinc-500 border border-gray-200/60 dark:border-zinc-700/60 cursor-not-allowed'
                                : isEnrolled 
                                ? 'bg-green-50 text-green-700' 
                                : isQueued 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-primary text-white group-hover:bg-primary-hover shadow-primary/20'
                            }`}>
                                {isInactive ? (
                                    <><Lock className="w-3 h-3 text-gray-400 dark:text-zinc-500" /> <span>{inactiveLabel || (level ? `Level ${level} • Inactive` : "Inactive • Unlocks Next")}</span></>
                                ) : isEnrolled ? "Active Journey" : isQueued ? "Next in Queue" : sprint.pricingType === 'credits' ? (<><span className="text-sm">🪙</span> {sprint.pointCost ?? 10}</>) : `₦${(sprint.price ?? 1000).toLocaleString()}`}
                            </div>
                        </div>
                    )}
                </div>
            </CardContainer>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    )
}

export default SprintCard;
