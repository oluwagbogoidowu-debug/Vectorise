import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, Review } from '../../types';
import { Link, useNavigate } from 'react-router-dom';

const CoachImpact: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [mySprints, setMySprints] = useState<Sprint[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        let unsubscribe: () => void = () => {};

        const initializeImpactData = async () => {
            setIsLoading(true);
            try {
                const fetchedSprints = await sprintService.getCoachSprints(user.id);
                setMySprints(fetchedSprints);

                // Sanitize IDs: Ensure we only pass valid strings to the Firestore query
                const mySprintIds = fetchedSprints
                    .map(s => s.id)
                    .filter(id => !!id && typeof id === 'string' && id.trim() !== '');
                
                // Set up real-time subscription for reviews
                unsubscribe = sprintService.subscribeToReviewsForSprints(mySprintIds, (updatedReviews) => {
                    setReviews(updatedReviews);
                    setIsLoading(false);
                });
            } catch (err) {
                console.error("Impact initialization error:", err);
                setIsLoading(false);
            }
        };

        initializeImpactData();

        return () => unsubscribe();
    }, [user]);

    const stats = useMemo(() => {
        if (reviews.length === 0) return { avg: 5.0, count: 0 };
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return {
            avg: (sum / reviews.length).toFixed(1),
            count: reviews.length
        };
    }, [reviews]);

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 pb-32 animate-fade-in">
            {/* Back Button */}
            <div className="mb-6">
                <button 
                    onClick={() => navigate('/coach/dashboard')} 
                    className="group flex items-center text-gray-400 hover:text-primary transition-colors text-sm font-bold cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Impact & Reputation</h1>
                    <p className="text-gray-500 font-medium">Measuring the visible progress you've catalyzed in others in real-time.</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Average Rating</p>
                        <p className="text-3xl font-black text-gray-900">{stats.avg} <span className="text-yellow-400 text-2xl">★</span></p>
                    </div>
                    <div className="w-px h-10 bg-gray-100"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Reviews</p>
                        <p className="text-3xl font-black text-gray-900">{stats.count}</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-50 shadow-sm">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Calculating Influence...</p>
                </div>
            ) : reviews.length > 0 ? (
                <div className="space-y-8">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                        Student Testimonials
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reviews.map((review) => {
                            const sprint = mySprints.find(s => s.id === review.sprintId);
                            return (
                                <div key={review.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <img src={review.userAvatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100" />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{review.userName}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{new Date(review.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex text-yellow-400 text-sm">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 font-medium italic leading-relaxed mb-6">"{review.comment}"</p>
                                    </div>
                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Program</span>
                                            <span className="text-xs font-bold text-primary group-hover:underline truncate max-w-[200px]">{sprint?.title || "Growth Sprint"}</span>
                                        </div>
                                        <Link to={`/coach/participants`} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">
                                            Track Student &rarr;
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <span className="text-4xl grayscale opacity-30">✨</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">The Silence of Early Success</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-10 font-medium px-6">Your impact is building. As soon as students finish their sprints and share their milestones, you'll see their ratings and praise here.</p>
                    <Link to="/coach/dashboard">
                        <button className="px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95">
                            Focus on current students
                        </button>
                    </Link>
                </div>
            )}
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default CoachImpact;