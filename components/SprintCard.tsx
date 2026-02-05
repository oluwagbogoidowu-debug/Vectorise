
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprint, Coach, UserRole, Participant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_PARTICIPANT_SPRINTS } from '../services/mockData';
import { userService } from '../services/userService';

interface SprintCardProps {
    sprint: Sprint;
    coach: Coach;
}

const SprintCard: React.FC<SprintCardProps> = ({ sprint, coach }) => {
    const { user, updateProfile } = useAuth();
    const [isProcessingSave, setIsProcessingSave] = useState(false);

    const isEnrolled = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.enrolledSprintIds?.includes(sprint.id) || MOCK_PARTICIPANT_SPRINTS.some(ps => ps.participantId === user.id && ps.sprintId === sprint.id);
    }, [user, sprint.id]);

    const isQueued = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.savedSprintIds?.includes(sprint.id);
    }, [user, sprint.id]);

    const isSaved = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        // Logic: A sprint can only be "Saved" if it is NOT in the active queue
        // Fix: Use the properly typed wishlistSprintIds property
        return p.wishlistSprintIds?.includes(sprint.id);
    }, [user, sprint.id]);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isProcessingSave || isQueued || isEnrolled) return;

        setIsProcessingSave(true);
        try {
            // Fix: Cast user to Participant for property access
            const p = user as Participant;
            const currentWishlist = p.wishlistSprintIds || [];
            const isCurrentlySaved = currentWishlist.includes(sprint.id);
            
            const newWishlist = isCurrentlySaved 
                ? currentWishlist.filter((id: string) => id !== sprint.id)
                : [...currentWishlist, sprint.id];

            await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
            // Fix: Remove 'as any'
            await updateProfile({ wishlistSprintIds: newWishlist });
        } catch (err) {
            console.error("Save toggle error", err);
        } finally {
            setIsProcessingSave(false);
        }
    };

    return (
        <div className="relative group h-full">
            {/* Save Toggle Overlay */}
            {!isEnrolled && !isQueued && (
                <button 
                    onClick={handleToggleSave}
                    disabled={isProcessingSave}
                    className={`absolute top-3 left-3 z-20 p-2.5 rounded-xl backdrop-blur-md transition-all duration-300 shadow-lg active:scale-90 ${
                        isSaved 
                        ? 'bg-primary text-white scale-110' 
                        : 'bg-white/80 text-gray-400 hover:text-primary hover:bg-white border border-white/20'
                    }`}
                >
                    {isProcessingSave ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    )}
                </button>
            )}

            <Link to={`/sprint/${sprint.id}`} className="bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col border border-gray-100 overflow-hidden h-full">
                <div className="relative h-48 overflow-hidden">
                    <img src={sprint.coverImageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-primary shadow-sm uppercase tracking-widest">{sprint.duration} Days</div>
                    {isQueued && (
                        <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-sm">In Queue</div>
                    )}
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">{sprint.category}</span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-primary transition-colors leading-tight">{sprint.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-grow font-medium leading-relaxed">{sprint.description}</p>
                    
                    <div className="pt-4 border-t border-gray-50 mt-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <img src={coach.profileImageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight truncate">{coach.name}</span>
                        </div>

                        <div className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center shadow-sm transition-all flex justify-center items-center gap-2 ${
                            isEnrolled 
                            ? 'bg-green-50 text-green-700' 
                            : isQueued 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-primary text-white group-hover:bg-primary-hover'
                        }`}>
                            {isEnrolled ? "Active Journey" : isQueued ? "Next in Queue" : sprint.pricingType === 'credits' ? (<><span className="text-base">🪙</span> {sprint.pointCost}</>) : `₦${sprint.price.toLocaleString()}`}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default SprintCard;
