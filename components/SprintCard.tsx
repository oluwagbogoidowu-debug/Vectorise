
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprint, Coach, UserRole, Participant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_PARTICIPANT_SPRINTS } from '../services/mockData';
import { userService, sanitizeData } from '../services/userService';
import { assetService } from '../services/assetService';

interface SprintCardProps {
    sprint: Sprint;
    coach: Coach;
    forceShowOutcomeTag?: boolean; 
    isStatic?: boolean; // New prop to disable navigation
}

const SprintCard: React.FC<SprintCardProps> = ({ sprint, coach, forceShowOutcomeTag = false, isStatic = false }) => {
    const { user, updateProfile } = useAuth();
    const [isProcessingSave, setIsProcessingSave] = useState(false);

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
        if (isStatic || !user || isProcessingSave || isQueued || isEnrolled) return;

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

    const CardContainer = isStatic ? 'div' : Link;
    const containerProps = isStatic ? {} : { to: `/sprint/${sprint.id}` };

    const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

    const displayDescription = useMemo(() => {
        return sprint.description || sprint.subtitle || "No description available.";
    }, [sprint.description, sprint.subtitle]);

    const displayCoach = useMemo(() => {
        const isFoundational = sprint.sprintType === 'Foundational' || 
                              sprint.category === 'Growth Fundamentals' || 
                              sprint.category === 'Core Platform Sprint';
        
        if (isFoundational) {
            return {
                ...coach,
                name: 'Vectorise',
                profileImageUrl: coach.profileImageUrl || 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
            };
        }
        
        if (!coach || !coach.name) {
            return {
                ...coach,
                name: 'Vectorise',
                profileImageUrl: coach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE
            } as Coach;
        }
        
        return coach;
    }, [coach, sprint.sprintType, sprint.category]);

    return (
        <div className="relative group w-full">
            {/* Sophisticated Bookmark Toggle */}
            {!isEnrolled && !isQueued && !isStatic && (
                <button 
                    onClick={handleToggleSave}
                    disabled={isProcessingSave}
                    className={`absolute top-1/2 -translate-y-1/2 -left-5 z-20 w-10 h-10 rounded-2xl backdrop-blur-xl transition-all duration-500 shadow-xl active:scale-90 flex items-center justify-center ${
                        isSaved 
                        ? 'bg-primary text-white scale-110' 
                        : 'bg-white/80 text-gray-400 hover:text-primary hover:bg-white border border-white/40'
                    }`}
                    title={isSaved ? "Remove from waitlist" : "Save to waitlist"}
                >
                    {isProcessingSave ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    )}
                </button>
            )}

            <CardContainer 
                {...(containerProps as any)} 
                className={`bg-white rounded-[2.5rem] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 flex flex-row items-center border border-gray-100/60 overflow-hidden group ${!isStatic ? 'hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-1 cursor-pointer' : 'cursor-default'}`}
            >
                {/* Image Section - Compact */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                        src={sprint.coverImageUrl || fallbackUrl} 
                        alt="" 
                        className={`w-full h-full object-cover transition-transform duration-1000 ${!isStatic ? 'group-hover:scale-110 group-hover:rotate-1' : ''}`} 
                        onError={(e) => { e.currentTarget.src = fallbackUrl; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-black text-primary shadow-sm uppercase tracking-widest">{sprint.duration}D</div>
                </div>
                
                {/* Content Section - Horizontal */}
                <div className="p-6 md:p-8 flex flex-row flex-grow items-center justify-between gap-6">
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-400 text-[8px] font-black uppercase tracking-widest">{sprint.category}</span>
                        </div>

                        <h3 className={`text-lg md:text-xl font-black text-gray-900 mb-0.5 transition-colors leading-tight tracking-tight truncate ${!isStatic ? 'group-hover:text-primary' : ''}`}>{sprint.title}</h3>
                        {sprint.subtitle && (
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none truncate">{sprint.subtitle}</p>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-8 flex-shrink-0">
                        {/* Coach */}
                        <div className="hidden md:flex items-center gap-3">
                            <img src={displayCoach?.profileImageUrl || assetService.URLS.DEFAULT_COACH_PROFILE} alt="" className="w-8 h-8 rounded-xl object-cover border border-gray-100 shadow-sm" />
                            <div className="min-w-0">
                                <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Coach</p>
                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{displayCoach.name}</p>
                            </div>
                        </div>

                        {/* Price/Status Button */}
                        <div className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-center shadow-sm transition-all duration-500 flex justify-center items-center gap-2 min-w-[140px] ${
                            isEnrolled 
                            ? 'bg-green-50 text-green-700' 
                            : isQueued 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-primary text-white group-hover:bg-primary-hover shadow-primary/10'
                        }`}>
                            {isEnrolled ? "Active" : isQueued ? "Queued" : sprint.pricingType === 'credits' ? (<><span className="text-sm">🪙</span> {sprint.pointCost}</>) : `₦${sprint.price.toLocaleString()}`}
                        </div>
                    </div>
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
