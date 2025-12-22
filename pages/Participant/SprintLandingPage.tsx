
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MOCK_SPRINTS, MOCK_USERS, SUBSCRIPTION_PLANS, MOCK_PARTICIPANT_SPRINTS, MOCK_REVIEWS } from '../../services/mockData';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../services/mockChatData';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, UserRole, Participant } from '../../types';
import { sprintService } from '../../services/sprintService';

// Helper to generate outcomes based on category (simulated data)
const getSprintOutcomes = (category: string) => {
    const outcomes: Record<string, string[]> = {
        'Productivity': ['Master your daily schedule', 'Eliminate procrastination', 'Achieve deep focus states'],
        'Personal Fitness': ['Boost daily energy levels', 'Build sustainable physical habits', 'Improve overall vitality'],
        'Leadership': ['Communicate with authority', 'Inspire and motivate teams', 'Make decisions with confidence'],
        'Personal Branding': ['Define your unique voice', 'Grow your audience organically', 'Monetize your expertise'],
        'Interpersonal Relationship': ['Deepen meaningful connections', 'Resolve conflicts gracefully', 'Build a strong support network'],
        'Skill Acquisition': ['Accelerate learning speed', 'Apply new skills immediately', 'Overcome the learning curve'],
        'default': ['Gain clarity on your goals', 'Build consistent daily habits', 'See visible progress in days']
    };
    return outcomes[category] || outcomes['default'];
};

const SprintLandingPage: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateProfile } = useAuth();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    
    // Retrieve 'from' state to handle back navigation correctly
    const { from } = location.state || {};
    
    const sprint = MOCK_SPRINTS.find(s => s.id === sprintId);
    const coach = MOCK_USERS.find(u => u.id === sprint?.coachId);

    const existingEnrollment = user ? MOCK_PARTICIPANT_SPRINTS.find(
        ps => ps.participantId === user.id && ps.sprintId === sprint?.id
    ) : null;

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (sprint && !existingEnrollment) {
            setShowPreview(true);
        }
    }, [sprint, existingEnrollment]);

    const sprintReviews = useMemo(() => {
        if (!sprint) return [];
        return MOCK_REVIEWS.filter(r => r.sprintId === sprint.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sprint]);

    if (!sprint) {
        return <div className="text-center py-10">Sprint not found.</div>;
    }
    
    if (!coach || coach.role !== UserRole.COACH) {
        return <div className="text-center py-10">Error: The coach for this sprint could not be found.</div>;
    }

    const sprintCoach = coach as Coach;
    const outcomes = getSprintOutcomes(sprint.category);

    const participant = user as Participant;
    const activePlanId = participant?.subscription?.active ? participant.subscription.planId : null;
    const activePlan = SUBSCRIPTION_PLANS.find(p => p.id === activePlanId);
    
    const isIncludedInPlan = activePlan && activePlan.includedDifficulties.includes(sprint.difficulty);

    const isOwner = user && (user.id === sprint.coachId || user.role === UserRole.ADMIN);

    const enrollAndNavigate = async () => {
        if (!user || !sprint) return;
        setIsEnrolling(true);

        try {
            const currentEnrollment = MOCK_PARTICIPANT_SPRINTS.find(
                ps => ps.participantId === user.id && ps.sprintId === sprint.id
            );

            if (currentEnrollment) {
                navigate(`/participant/sprint/${currentEnrollment.id}`, { state: { from } });
                return;
            }

            const newEnrollment = await sprintService.enrollUser(user.id, sprint.id, sprint.duration);
            MOCK_PARTICIPANT_SPRINTS.push(newEnrollment);

            const coachId = sprint.coachId;
            const existingConversation = MOCK_CONVERSATIONS.find(c => 
                c.type === 'direct' &&
                c.participants.some(p => p.userId === user.id) &&
                c.participants.some(p => p.userId === coachId)
            );

            if (!existingConversation) {
                const { newConversation, newMessage } = await chatService.createConversation(
                    user.id,
                    coachId,
                    `Welcome to ${sprint.title}! I'm here to help.`
                );
                MOCK_CONVERSATIONS.push(newConversation);
                MOCK_MESSAGES[newConversation.id] = [newMessage];
            }

            navigate(`/participant/sprint/${newEnrollment.id}`, { state: { from } });
        } catch (error) {
            alert("Failed to enroll. Please try again.");
            console.error(error);
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleJoinClick = () => {
        setShowPreview(false);
        if (!user) {
            navigate('/login');
            return;
        }

        if (existingEnrollment) {
            navigate(`/participant/sprint/${existingEnrollment.id}`, { state: { from } });
            return;
        }

        if (isIncludedInPlan || isOwner) {
            if (!isOwner) alert(`Access Granted via your ${activePlan.name} Plan!`);
            enrollAndNavigate();
        } else {
            setShowPaymentModal(true);
        }
    };

    const handleConfirmPayment = async (method: 'cash' | 'points' | 'hybrid' | 'upgrade') => {
        if (!user) return;
        
        const currentUser = user as Participant;
        const currentBalance = currentUser.walletBalance || 0;
        const sprintCost = sprint.pointCost || 5;

        if (method === 'cash') {
            alert(`Payment of ₦${sprint.price.toLocaleString()} successful!`);
            setShowPaymentModal(false);
            await enrollAndNavigate();
        } else if (method === 'points') {
            if (currentBalance >= sprintCost) {
                 try {
                     const newBalance = currentBalance - sprintCost;
                     await updateProfile({ walletBalance: newBalance });
                     alert(`Redeemed ${sprintCost} Credits! Remaining: ${newBalance}`);
                     setShowPaymentModal(false);
                     await enrollAndNavigate();
                 } catch (error) {
                     console.error("Payment failed", error);
                     alert("Failed to process point payment. Please try again.");
                 }
            } else {
                alert("Insufficient points.");
            }
        } else if (method === 'hybrid') {
             if (currentBalance >= 3) {
                 try {
                     const newBalance = currentBalance - 3;
                     const discountedPrice = sprint.price * 0.1;
                     await updateProfile({ walletBalance: newBalance });
                     alert(`Redeemed 3 Credits + Paid ₦${discountedPrice.toLocaleString()}! Sprint Unlocked.`);
                     setShowPaymentModal(false);
                     await enrollAndNavigate();
                 } catch (error) {
                     console.error("Payment failed", error);
                     alert("Failed to process payment. Please try again.");
                 }
             } else {
                 alert("Insufficient points for hybrid deal.");
             }
        } else if (method === 'upgrade') {
            navigate('/impact/rewards', { state: { fromSprintId: sprint.id } }); 
        }
    };

    const handleBack = () => {
        if (from) {
            navigate(from);
        } else {
            navigate('/discover');
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
            <button 
                onClick={handleBack} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-4 text-sm font-medium relative z-10 cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {from ? 'Back to Management' : 'Back to Discover'}
            </button>

            <div className="bg-white rounded-xl shadow-2xl overflow-hidden relative mb-8">
                <img src={sprint.coverImageUrl} alt={sprint.title} className="w-full h-64 object-cover" />
                <div className="p-8">
                    <div className="flex justify-between items-start mb-2">
                        <h1 className="text-4xl font-extrabold text-dark">{sprint.title}</h1>
                        {isOwner ? (
                            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
                                Owner Mode
                            </span>
                        ) : existingEnrollment ? (
                             <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                Active Sprint
                            </span>
                        ) : isIncludedInPlan ? (
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                Included in {activePlan?.name}
                            </span>
                        ) : null}
                    </div>
                    <p className="text-lg text-secondary font-semibold mb-4">
                        {sprint.duration} Days · {sprint.category} · {sprint.difficulty}
                    </p>
                    <p className="text-gray-600 text-lg mb-6">{sprint.description}</p>
                    
                    <div className="flex items-center gap-4 mb-8 p-4 bg-light rounded-lg">
                        <img src={sprintCoach.profileImageUrl} alt={sprintCoach.name} className="w-16 h-16 rounded-full object-cover"/>
                        <div>
                            <p className="text-gray-500 text-sm">Created by</p>
                            <p className="font-bold text-lg">{sprintCoach.name}</p>
                            <p className="text-gray-600">{sprintCoach.niche}</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button 
                            onClick={handleJoinClick} 
                            isLoading={isEnrolling}
                            className="text-xl px-12 py-4 shadow-lg hover:shadow-xl hover:scale-105 transform transition-all w-full md:w-auto"
                        >
                            {isOwner 
                                ? 'Preview Sprint' 
                                : existingEnrollment 
                                    ? 'Continue Sprint' 
                                    : (isIncludedInPlan) 
                                        ? 'Start Sprint Now' 
                                        : `Unlock Sprint`}
                        </Button>
                        {!existingEnrollment && !isIncludedInPlan && !isOwner && <p className="text-sm text-gray-400 mt-2">Starts at ₦{sprint.price.toLocaleString()} or Included in Subscriptions</p>}
                    </div>
                </div>
            </div>

            {/* Public Reviews Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews ({sprintReviews.length})</h2>
                
                <div className="space-y-6">
                    {sprintReviews.length > 0 ? (
                        sprintReviews.map(review => (
                            <div key={review.id} className="flex gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                                <img src={review.userAvatar} alt={review.userName} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-900">{review.userName}</span>
                                        <div className="flex text-yellow-400 text-xs">
                                            {'★'.repeat(review.rating)}
                                            <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(review.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 italic">No reviews yet. Join the sprint and be the first!</p>
                    )}
                </div>
            </div>

            {/* OUTCOME PREVIEW POPUP */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-slide-up">
                        <button 
                            onClick={() => setShowPreview(false)} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 z-10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="h-32 bg-gradient-to-br from-primary to-[#0B6040] relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-black/10"></div>
                            <div className="relative z-10 text-center px-6">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider mb-2">
                                    Sprint Preview
                                </span>
                                <h2 className="text-2xl font-bold text-white leading-tight">{sprint.title}</h2>
                            </div>
                        </div>

                        <div className="p-8">
                            <p className="text-gray-600 text-sm mb-6 leading-relaxed text-center">
                                {sprint.description.length > 100 ? sprint.description.substring(0, 100) + '...' : sprint.description}
                            </p>

                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-xl">🎯</span> What you'll achieve:
                            </h3>
                            <ul className="space-y-3 mb-8">
                                {outcomes.map((outcome, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-green-50 p-3 rounded-xl border border-green-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-800 font-medium">{outcome}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button onClick={() => setShowPreview(false)} className="w-full py-4 text-lg shadow-lg hover:shadow-xl">
                                {isOwner ? 'Preview Sprint Content' : 'View Details & Join'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Unlock {sprint.title}</h3>
                                <p className="text-sm text-gray-500">{sprint.difficulty} Sprint</p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-5 relative overflow-hidden">
                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <h4 className="font-bold text-purple-900 text-lg">Best Value: Upgrade Plan</h4>
                                        <p className="text-sm text-purple-700">Get unlimited access to {sprint.difficulty} sprints + community.</p>
                                    </div>
                                    <Button onClick={() => handleConfirmPayment('upgrade')} className="bg-purple-600 hover:bg-purple-700 text-white">
                                        View Plans
                                    </Button>
                                </div>
                            </div>

                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">One-Time Purchase Options</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="border border-gray-200 rounded-xl p-5 hover:border-primary cursor-pointer hover:shadow-md transition-all flex flex-col justify-between" onClick={() => handleConfirmPayment('cash')}>
                                    <div>
                                        <span className="text-2xl mb-2 block">💳</span>
                                        <h4 className="font-bold text-gray-900 mb-1">Standard</h4>
                                        <p className="text-xs text-gray-500 mb-4">Pay with Card/Transfer</p>
                                    </div>
                                    <div className="mt-4">
                                        <span className="block text-2xl font-bold text-gray-900">₦{sprint.price.toLocaleString()}</span>
                                        <button className="mt-3 w-full py-2 bg-gray-100 text-gray-900 font-bold rounded-lg text-sm group-hover:bg-primary group-hover:text-white transition-colors">Select</button>
                                    </div>
                                </div>

                                <div className={`border rounded-xl p-5 transition-all flex flex-col justify-between ${
                                    (user as Participant).walletBalance && (user as Participant).walletBalance! >= (sprint.pointCost || 5)
                                    ? 'border-yellow-300 bg-yellow-50/50 hover:bg-yellow-50 cursor-pointer hover:shadow-md'
                                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                }`} onClick={() => {
                                    if ((user as Participant).walletBalance && (user as Participant).walletBalance! >= (sprint.pointCost || 5)) {
                                        handleConfirmPayment('points');
                                    }
                                }}>
                                    <div>
                                        <span className="text-2xl mb-2 block">🪙</span>
                                        <h4 className="font-bold text-gray-900 mb-1">Growth Credits</h4>
                                        <p className="text-xs text-gray-500 mb-4">Redeem points</p>
                                    </div>
                                    <div className="mt-4">
                                        <span className="block text-2xl font-bold text-yellow-700">{sprint.pointCost || 5} Credits</span>
                                        <p className="text-xs text-gray-500 mt-1">Balance: {(user as Participant).walletBalance || 0}</p>
                                        <button 
                                            disabled={!((user as Participant).walletBalance && (user as Participant).walletBalance! >= (sprint.pointCost || 5))}
                                            className="mt-3 w-full py-2 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm"
                                        >
                                            {(user as Participant).walletBalance && (user as Participant).walletBalance! >= (sprint.pointCost || 5) ? 'Redeem' : 'Not enough'}
                                        </button>
                                    </div>
                                </div>

                                <div className={`border rounded-xl p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                                    (user as Participant).walletBalance && (user as Participant).walletBalance! >= 3
                                    ? 'border-primary bg-green-50/50 hover:bg-green-50 cursor-pointer hover:shadow-md'
                                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                }`} onClick={() => {
                                    if ((user as Participant).walletBalance && (user as Participant).walletBalance! >= 3) {
                                        handleConfirmPayment('hybrid');
                                    }
                                }}>
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                        90% OFF
                                    </div>
                                    <div>
                                        <span className="text-2xl mb-2 block">🔥</span>
                                        <h4 className="font-bold text-gray-900 mb-1">Community Deal</h4>
                                        <p className="text-xs text-gray-500 mb-4">3 Credits + 10% Cash</p>
                                    </div>
                                    <div className="mt-4">
                                        <span className="block text-xl font-bold text-primary">₦{(sprint.price * 0.1).toLocaleString()}</span>
                                        <span className="block text-sm font-bold text-gray-500">+ 3 Credits</span>
                                        <button 
                                            disabled={!((user as Participant).walletBalance && (user as Participant).walletBalance! >= 3)}
                                            className="mt-3 w-full py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary-hover"
                                        >
                                            Claim Deal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                             <p className="text-xs text-gray-500">Need more credits? <a href="/#/impact/rewards" className="text-primary font-bold hover:underline">Visit Wallet</a></p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;
