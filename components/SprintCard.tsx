
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprint, Coach, UserRole, Participant, ParticipantSprint } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { sprintService } from '../services/sprintService';

interface SprintCardProps {
    sprint: Sprint;
    coach: Coach;
}

const SprintCard: React.FC<SprintCardProps> = ({ sprint, coach }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isSaved, setIsSaved] = useState(false);
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState(false);

    useEffect(() => {
        const checkEnrollmentAndSavedStatus = async () => {
            if (user && user.role === UserRole.PARTICIPANT) {
                const p = user as Participant;
                setIsSaved(p.savedSprintIds?.includes(sprint.id) || false);

                const currentEnrollment = await sprintService.getEnrollmentByUserAndSprint(user.id, sprint.id);
                setEnrollment(currentEnrollment);
            } else {
                setIsSaved(false);
                setEnrollment(null);
            }
            setIsLoading(false);
        };

        checkEnrollmentAndSavedStatus();
    }, [user, sprint.id]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || user.role !== UserRole.PARTICIPANT || actionInProgress) return;
        
        const p = user as Participant;
        const newSavedState = !isSaved;
        
        setActionInProgress(true);
        setIsSaved(newSavedState); // Optimistic UI update

        try {
            await userService.toggleSavedSprint(user.id, sprint.id, newSavedState);
            // Update local context/state if necessary
            let updatedIds = p.savedSprintIds ? [...p.savedSprintIds] : [];
            if (newSavedState) {
                updatedIds.push(sprint.id);
            } else {
                updatedIds = updatedIds.filter(id => id !== sprint.id);
            }
            p.savedSprintIds = updatedIds;
        } catch (error) {
            console.error("Failed to save sprint", error);
            setIsSaved(!newSavedState); // Revert UI on error
        } finally {
            setActionInProgress(false);
        }
    };

    const handlePrimaryAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (actionInProgress) return;

        if (enrollment) {
            // User is enrolled (active or not), go to the detailed sprint view
            navigate(`/participant/sprint/${enrollment.id}`);
        } else {
            // User is not enrolled, go to the public landing page to join
            navigate(`/sprint/${sprint.id}`);
        }
    };

    const getButtonState = () => {
        if (isLoading) {
            return { text: 'Loading...', price: false, buttonType: 'join' };
        }
        
        const isEnrolled = !!enrollment;
        if (isEnrolled) {
            const startDate = new Date(enrollment!.startDate);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + sprint.duration);
            const now = new Date();
            const isActive = now >= startDate && now <= endDate;

            if (isActive) {
                return { text: 'Continue Sprint', price: false, buttonType: 'continue' };
            } else {
                return { text: 'View Sprint', price: false, buttonType: 'continue' };
            }
        }

        return { text: 'Join Sprint', price: true, buttonType: 'join' };
    };

    const buttonState = getButtonState();

    return (
        <div onClick={handlePrimaryAction} className="cursor-pointer group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-gray-100 overflow-hidden h-full">
            {/* Card Content */}
            <div className="relative h-48 overflow-hidden">
                <img src={sprint.coverImageUrl} alt={sprint.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                    {sprint.duration} Days
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide uppercase">{sprint.category}</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${
                        sprint.difficulty === 'Beginner' ? 'bg-green-50 text-green-700' :
                        sprint.difficulty === 'Intermediate' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                    }`}>{sprint.difficulty}</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{sprint.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-6 flex-grow">{sprint.description}</p>
                
                <div className="pt-4 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={coach.profileImageUrl} alt={coach.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div>
                            <span className="text-sm font-bold text-gray-900 leading-none mb-1">{coach.name}</span>
                            <span className="text-xs text-gray-500">{coach.niche} Coach</span>
                        </div>
                    </div>

                    <div className="flex gap-3 items-center">
                        {/* Primary Action Button */}
                        <button 
                            onClick={handlePrimaryAction} 
                            disabled={actionInProgress || isLoading}
                            className={`flex-1 py-3 rounded-lg font-semibold text-center shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 ${
                                buttonState.buttonType === 'join'
                                    ? 'bg-primary text-white hover:bg-primary-hover'
                                    : 'bg-gray-200 text-primary hover:bg-gray-300'
                            }`}
                        >
                            <span>{buttonState.text}</span>
                            {buttonState.price && (
                                <>
                                    <span className="opacity-50">•</span>
                                    <span>₦{sprint.price.toLocaleString()}</span>
                                </>
                            )}
                        </button>

                        {/* Save Button */}
                        <button 
                            onClick={handleSave}
                            disabled={actionInProgress || isLoading}
                            className={`p-3 rounded-lg border transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50 ${
                                isSaved 
                                ? 'bg-red-50 border-red-200 text-red-500' 
                                : 'bg-white border-gray-200 text-gray-400 hover:border-primary hover:text-primary'
                            }`}
                            title={isSaved ? "Remove from Saved" : "Save Sprint"}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SprintCard;
