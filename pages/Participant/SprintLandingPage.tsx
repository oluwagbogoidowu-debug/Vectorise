
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { MOCK_USERS, SUBSCRIPTION_PLANS } from '../../services/mockData';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, UserRole, Participant, Sprint, Review, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { userService } from '../../services/userService';
import { getSprintOutcomes } from '../../utils/sprintUtils';
import FormattedText from '../../components/FormattedText';

const SprintLandingPage: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateProfile } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isQueuing, setIsQueuing] = useState(false);
    const [isProcessingSave, setIsProcessingSave] = useState(false);
    
    const { from } = location.state || {};
    
    useEffect(() => {
        const fetchSprintAndCoach = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
                
                if (data) {
                    const mockCoach = MOCK_USERS.find(u => u.id === data.coachId) as Coach;
                    if (mockCoach) {
                        setFetchedCoach(mockCoach);
                    } else if (data.category !== 'Core Platform Sprint' && data.category !== 'Growth Fundamentals') {
                        const dbCoach = await userService.getUserDocument(data.coachId);
                        setFetchedCoach(dbCoach as Coach);
                    }
                }
                
                if (user) {
                    const enrollments = await sprintService.getUserEnrollments(user.id);
                    setUserEnrollments(enrollments);
                }
            } catch (err) {
                console.error("Error fetching sprint landing data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprintAndCoach();
    }, [sprintId, user]);

    useEffect(() => {
        if (!sprintId) return;
        const unsubscribe = sprintService.subscribeToReviewsForSprints([sprintId], (updatedReviews) => {
            setReviews(updatedReviews);
        });
        return () => unsubscribe();
    }, [sprintId]);

    const outcomes = useMemo(() => {
        if (!sprint) return [];
        return getSprintOutcomes(sprint);
    }, [sprint]);

    const existingEnrollment = useMemo(() => {
        if (!user || !userEnrollments.length) return null;
        return userEnrollments.find(e => e.sprintId === sprintId);
    }, [userEnrollments, sprintId]);

    const activeSprint = useMemo(() => {
        if (!user || !userEnrollments.length) return null;
        return userEnrollments.find(e => e.progress.some(p => !p.completed));
    }, [userEnrollments]);

    const isAlreadyQueued = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.savedSprintIds?.includes(sprintId || '');
    }, [user, sprintId]);

    const isSaved = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.wishlistSprintIds?.includes(sprintId || '');
    }, [user, sprintId]);

    if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    if (!sprint) return <div className="text-center py-20"><h2 className="text-2xl font-bold mb-4">Sprint not found.</h2><Button onClick={() => navigate('/discover')}>Discover Sprints</Button></div>;
    
    const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';
    
    const sprintCoach = isFoundational ? { 
        name: 'Vectorise Platform', 
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw', 
        niche: 'Official Evolution Framework' 
    } : (fetchedCoach || { 
        name: 'Registry Coach', 
        profileImageUrl: 'https://ui-avatars.com/api/?name=Coach&background=0E7850&color=fff', 
        niche: 'Growth Specialist' 
    });

    const participant = user as Participant;
    const activePlan = SUBSCRIPTION_PLANS.find(p => p.id === participant?.subscription?.planId);
    const isIncludedInPlan = activePlan && activePlan.includedDifficulties.includes(sprint.difficulty);
    const isOwner = user && (user.id === sprint.coachId || user.role === UserRole.ADMIN);

    const handleToggleSave = async () => {
        if (!user || isProcessingSave || isAlreadyQueued || existingEnrollment) return;
        setIsProcessingSave(true);
        try {
            const p = user as Participant;
            const currentWishlist = p.wishlistSprintIds || [];
            const alreadySaved = currentWishlist.includes(sprint.id);
            const newWishlist = alreadySaved 
                ? currentWishlist.filter((id: string) => id !== sprint.id)
                : [...currentWishlist, sprint.id];

            await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
            await updateProfile({ wishlistSprintIds: newWishlist });
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessingSave(false);
        }
    };

    const enrollAndNavigate = async () => {
        if (!user || !sprint) return;
        setIsEnrolling(true);
        try {
            const p = user as Participant;
            const currentWishlist = p.wishlistSprintIds || [];
            const currentQueue = p.savedSprintIds || [];
            
            const updates: Partial<Participant> = {};
            
            if (currentWishlist.includes(sprint.id)) {
                updates.wishlistSprintIds = currentWishlist.filter((id: string) => id !== sprint.id);
            }
            
            if (currentQueue.includes(sprint.id)) {
                updates.savedSprintIds = currentQueue.filter((id: string) => id !== sprint.id);
            }

            if (Object.keys(updates).length > 0) {
                await userService.updateUserDocument(user.id, updates);
                await updateProfile(updates);
            }

            const enrollment = await sprintService.enrollUser(user.id, sprint.id, sprint.duration);
            
            if (!isFoundational) {
                await notificationService.createNotification(sprint.coachId, {
                    type: 'sprint_update',
                    text: `${user.name} enrolled in your sprint "${sprint.title}"`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    link: `/coach/participants`
                });
            }
            
            navigate(`/participant/sprint/${enrollment.id}`, { state: { from } });
        } catch (error) {
            alert("Failed to enroll.");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleJoinClick = () => {
        if (!user) { navigate('/login'); return; }
        
        if (existingEnrollment) { 
            navigate(`/participant/sprint/${existingEnrollment.id}`, { state: { from } }); 
            return; 
        }

        if (isAlreadyQueued && activeSprint) {
            alert("This program is already in your upcoming queue. Complete your current cycle to start.");
            return;
        }

        if (activeSprint) {
            if (isIncludedInPlan || isOwner || (isFoundational && (participant.walletBalance || 0) >= (sprint.pointCost || 0))) {
                setShowQueueModal(true);
                return;
            }
            setShowPaymentModal(true);
            return;
        }

        if (isIncludedInPlan || isOwner) { enrollAndNavigate(); return; }
        setShowPaymentModal(true);
    };

    const handleAddToQueue = async () => {
        if (!user || !sprint) return;
        setIsQueuing(true);
        try {
            const p = user as Participant;
            const currentWishlist = p.wishlistSprintIds || [];
            if (currentWishlist.includes(sprint.id)) {
                const newWishlist = currentWishlist.filter((id: string) => id !== sprint.id);
                await userService.updateUserDocument(user.id, { wishlistSprintIds: newWishlist });
                await updateProfile({ wishlistSprintIds: newWishlist });
            }

            if (isFoundational && !isIncludedInPlan && !isOwner) {
                const pointCost = sprint.pointCost || 0;
                const currentBalance = participant.walletBalance || 0;
                if (currentBalance < pointCost) {
                    alert("Insufficient credits.");
                    setIsQueuing(false);
                    return;
                }
                await updateProfile({ walletBalance: currentBalance - pointCost });
            }

            await userService.toggleSavedSprint(user.id, sprint.id, true);
            alert(`"${sprint.title}" is unlocked and added to your upcoming queue.`);
            setShowQueueModal(false);
            navigate('/my-sprints');
        } catch (error) {
            alert("Failed to add to queue.");
        } finally {
            setIsQueuing(false);
        }
    };

    const handleConfirmPayment = async (method: 'cash' | 'points' | 'upgrade') => {
        if (!user) return;
        const currentUser = user as Participant;
        const currentBalance = currentUser.walletBalance || 0;
        const sprintCost = sprint.pointCost || 0;

        if (method === 'cash') {
            alert(`Payment of ₦${sprint.price.toLocaleString()} successful!`);
            setShowPaymentModal(false);
            if (activeSprint) {
                await handleAddToQueue();
            } else {
                await enrollAndNavigate();
            }
        } else if (method === 'points') {
            if (currentBalance >= sprintCost) {
                 try {
                     const newBalance = currentBalance - sprintCost;
                     await updateProfile({ walletBalance: newBalance });
                     alert(`Redeemed ${sprintCost} Credits!`);
                     setShowPaymentModal(false);
                     if (activeSprint) {
                        await handleAddToQueue();
                     } else {
                        await enrollAndNavigate();
                     }
                 } catch (error) {
                     alert("Failed to process redemption.");
                 }
            } else {
                alert("Insufficient credits.");
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 pb-24 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Go Back
                </button>
                
                {!existingEnrollment && !isAlreadyQueued && (
                    <button 
                        onClick={handleToggleSave}
                        disabled={isProcessingSave}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                            isSaved 
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10' 
                            : 'bg-white text-gray-400 border-gray-100 hover:text-primary hover:border-primary/20'
                        }`}
                    >
                        {isProcessingSave ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">{isSaved ? 'Bookmarked' : 'Save for later'}</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="relative h-64 sm:h-80 rounded-[3rem] overflow-hidden shadow-lg mb-8 group">
                        <img src={sprint.coverImageUrl} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-10 left-10 right-10 text-white">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border ${
                                isFoundational ? 'bg-primary/90 border-primary-focus' : 'bg-blue-600/80 border-blue-400'
                            } backdrop-blur-sm shadow-xl`}>
                                {isFoundational ? 'Core Platform' : sprint.category}
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tighter">
                                <FormattedText text={sprint.title} />
                            </h1>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm mb-8 relative overflow-hidden">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-6">Program Intent</h2>
                        <div className="text-gray-700 text-lg leading-relaxed font-medium space-y-4">
                            <FormattedText text={sprint.description} />
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    <section>
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-8 px-2">Projected Outcomes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {outcomes.map((outcome, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 group hover:border-primary/20 transition-all">
                                    <div className="w-9 h-9 bg-primary/5 text-primary rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 leading-snug pt-1.5">{outcome}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl sticky top-8 animate-slide-up">
                        <div className="text-center mb-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cycle Investment</p>
                            <div className="inline-flex items-center gap-2">
                                {sprint.pricingType === 'credits' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl">🪙</span>
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{sprint.pointCost}</h3>
                                    </div>
                                ) : (
                                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">₦{sprint.price.toLocaleString()}</h3>
                                )}
                            </div>
                        </div>

                        <Button 
                            onClick={handleJoinClick} 
                            isLoading={isEnrolling} 
                            disabled={isAlreadyQueued && !!activeSprint}
                            className="w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                        >
                            {isOwner ? 'Owner Preview' : 
                             existingEnrollment ? 'Resume Path' : 
                             (isAlreadyQueued && !!activeSprint) ? 'Secured in Queue' : 
                             activeSprint ? (isFoundational ? 'Unlock & Queue' : 'Secure & Queue') : 
                             isIncludedInPlan ? 'Start Program' : 'Begin Evolution'}
                        </Button>

                        {isIncludedInPlan && (
                            <div className="mt-6 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center gap-2">
                                <span className="text-green-600 text-sm">✓</span>
                                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Included in your {activePlan?.name} plan</p>
                            </div>
                        )}

                        <div className="mt-10 pt-10 border-t border-gray-50 flex flex-col items-center text-center">
                            <div className="relative mb-4 group">
                                <img src={sprintCoach.profileImageUrl} alt="" className="w-20 h-20 rounded-[1.5rem] object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform" />
                                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-full border-2 border-white shadow-lg">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                </div>
                            </div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Guided By</p>
                            <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">{sprintCoach.name}</h4>
                            <p className="text-[10px] text-primary font-bold uppercase mt-1 italic">"{sprintCoach.niche}"</p>
                        </div>
                    </div>
                </aside>
            </div>

            {/* PAYMENT MODAL */}
            {showPaymentModal && user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden p-10 border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Access Token</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="space-y-6">
                            {sprint.pricingType === 'credits' ? (
                                <div className="bg-gray-50 rounded-[2.5rem] p-10 text-center border border-gray-100 shadow-inner">
                                    <span className="text-5xl mb-6 block">🪙</span>
                                    <h4 className="font-black text-gray-900 uppercase tracking-widest mb-2">Foundational Access</h4>
                                    <p className="text-4xl font-black text-primary mb-10 tracking-tighter">{sprint.pointCost} <span className="text-base text-gray-400">Credits</span></p>
                                    <Button 
                                        disabled={(user as Participant).walletBalance! < (sprint.pointCost || 0)}
                                        onClick={() => handleConfirmPayment('points')} 
                                        className="w-full py-5 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                                    >
                                        {(user as Participant).walletBalance! < (sprint.pointCost || 0) ? 'Insufficient Balance' : 'Redeem & Unlock'}
                                    </Button>
                                    <p className="mt-6 text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Current Balance: {(user as Participant).walletBalance || 0} 🪙</p>
                                </div>
                            ) : (
                                <div className="bg-primary/5 rounded-[2.5rem] p-10 text-center border border-primary/10 shadow-inner">
                                    <span className="text-5xl mb-6 block">💳</span>
                                    <h4 className="font-black text-gray-900 uppercase tracking-widest mb-2">Premium Investment</h4>
                                    <p className="text-4xl font-black text-primary mb-10 tracking-tighter">₦{sprint.price.toLocaleString()}</p>
                                    <Button onClick={() => handleConfirmPayment('cash')} className="w-full py-5 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">Pay with Card</Button>
                                    <p className="mt-6 text-[9px] font-black text-primary uppercase tracking-widest italic leading-relaxed">Acceleration programs are designed for deeper behavioral shifts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FLEXIBLE QUEUE MODAL */}
            {showQueueModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md overflow-hidden p-12 text-center border border-white/10 relative">
                        <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-1 ring-blue-100 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-none">The Path of Focus.</h3>
                        <p className="text-gray-500 font-medium leading-relaxed mb-10 italic text-lg px-2">
                            To ensure visible progress, you can only run ONE active sprint at a time. Secure this program now — it will be ready in your queue the moment your current cycle ends.
                        </p>
                        
                        <div className="space-y-4">
                            <Button 
                                onClick={handleAddToQueue} 
                                isLoading={isQueuing}
                                className="w-full py-6 bg-primary text-white font-black uppercase tracking-[0.2em] text-xs rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Secure My Spot
                            </Button>
                            <button 
                                onClick={() => setShowQueueModal(false)}
                                className="w-full py-4 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-gray-600 transition-colors"
                            >
                                Re-evaluate Later
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;
