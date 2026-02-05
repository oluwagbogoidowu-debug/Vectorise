
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
        return p.wishlistSprintIds?.includes(sprint.id);
    }, [user, sprint.id]);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isProcessingSave || isQueued || isEnrolled) return;

        setIsProcessingSave(true);
        try {
            const p = user as Participant;
            const currentWishlist = p.wishlistSprintIds || [];
            const isCurrentlySaved = currentWishlist.includes(sprint.id);
            
            const newWishlist = isCurrentlySaved 
                ? currentWishlist.filter((id: string) => id !== sprint.id)
                : [...currentWishlist, sprint.id];

            await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
            await updateProfile({ wishlistSprintIds: newWishlist });
        } catch (err) {
            console.error("Save toggle error", err);
        } finally {
            setIsProcessingSave(false);
        }
    };

    return (
        <div className="relative group h-full">
            {/* Sophisticated Bookmark Toggle */}
            {!isEnrolled && !isQueued && (
                <button 
                    onClick={handleToggleSave}
                    disabled={isProcessingSave}
                    className={`absolute top-4 left-4 z-20 w-11 h-11 rounded-[1.25rem] backdrop-blur-xl transition-all duration-500 shadow-xl active:scale-90 flex items-center justify-center ${
                        isSaved 
                        ? 'bg-primary text-white scale-110' 
                        : 'bg-white/80 text-gray-400 hover:text-primary hover:bg-white border border-white/40'
                    }`}
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

            <Link to={`/sprint/${sprint.id}`} className="bg-white rounded-[3rem] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] transition-all duration-700 flex flex-col border border-gray-100/60 overflow-hidden h-full group hover:-translate-y-2">
                <div className="relative h-60 overflow-hidden">
                    <img src={sprint.coverImageUrl} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-primary shadow-lg uppercase tracking-[0.2em]">{sprint.duration} Days</div>
                    {isQueued && (
                        <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-[0.2em] shadow-lg">In Queue</div>
                    )}
                </div>
                
                <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 text-[9px] font-black uppercase tracking-[0.25em]">{sprint.category}</span>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-primary transition-colors leading-[1.1] tracking-tight">{sprint.title}</h3>
                    <p className="text-[13px] text-gray-500 line-clamp-2 mb-8 flex-grow font-medium leading-relaxed italic opacity-80">"{sprint.description}"</p>
                    
                    <div className="pt-6 border-t border-gray-50 mt-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <img src={coach.profileImageUrl} alt="" className="w-10 h-10 rounded-[1.25rem] object-cover border-2 border-white shadow-md ring-1 ring-gray-100" />
                            <div className="min-w-0">
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Guided By</p>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">{coach.name}</p>
                            </div>
                        </div>

                        <div className={`py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] text-center shadow-sm transition-all duration-500 flex justify-center items-center gap-3 ${
                            isEnrolled 
                            ? 'bg-green-50 text-green-700' 
                            : isQueued 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-primary text-white group-hover:bg-primary-hover shadow-primary/20'
                        }`}>
                            {isEnrolled ? "Active Journey" : isQueued ? "Next in Queue" : sprint.pricingType === 'credits' ? (<><span className="text-lg">🪙</span> {sprint.pointCost}</>) : `₦${sprint.price.toLocaleString()}`}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default SprintCard;
