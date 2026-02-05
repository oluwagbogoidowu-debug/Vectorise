import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isProcessingSave, setIsProcessingSave] = useState(false);
    
    const { from } = location.state || {};
    
    useEffect(() => {
        const fetchData = async () => {
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
        fetchData();
    }, [sprintId, user]);

    const outcomes = useMemo(() => sprint ? getSprintOutcomes(sprint) : [], [sprint]);

    const existingEnrollment = useMemo(() => {
        if (!user || !userEnrollments.length) return null;
        return userEnrollments.find(e => e.sprintId === sprintId);
    }, [userEnrollments, sprintId]);

    const isSaved = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return false;
        const p = user as Participant;
        return p.wishlistSprintIds?.includes(sprintId || '');
    }, [user, sprintId]);

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-3xl font-black mb-6">Program not found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

    const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';
    const sprintCoach = isFoundational ? { name: 'Vectorise Platform', profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd', niche: 'Core Framework' } : (fetchedCoach || { name: 'Coach', profileImageUrl: 'https://ui-avatars.com/api/?name=Coach&background=0E7850&color=fff', niche: 'Guide' });

    const enrollAndNavigate = async () => {
        if (!user || !sprint) return;
        setIsEnrolling(true);
        try {
            const enrollment = await sprintService.enrollUser(user.id, sprint.id, sprint.duration);
            navigate(`/participant/sprint/${enrollment.id}`, { state: { from } });
        } catch (error) {
            alert("Enrollment failed.");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleJoinClick = () => {
        if (!user) { navigate('/login'); return; }
        if (existingEnrollment) { navigate(`/participant/sprint/${existingEnrollment.id}`, { state: { from } }); return; }
        enrollAndNavigate();
    };

    return (
        <div className="bg-light min-h-screen font-sans text-base lg:text-lg pb-32">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 pt-6">
                
                {/* Top Nav */}
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-500 hover:text-primary transition-all text-sm font-bold uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    {!existingEnrollment && (
                        <button onClick={() => {}} className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'}`}>
                            {isSaved ? 'Bookmarked' : 'Save Path'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                    
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-10">
                        
                        {/* Hero Card */}
                        <div className="relative h-[280px] sm:h-[400px] lg:h-[500px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl group">
                            <img src={sprint.coverImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
                            <div className="absolute bottom-8 left-8 right-8 md:bottom-12 md:left-12 lg:bottom-16 lg:left-16 text-white">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20">{sprint.category}</span>
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20">{sprint.difficulty}</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none mb-2">
                                    <FormattedText text={sprint.title} />
                                </h1>
                                <p className="text-white/60 text-sm md:text-base font-bold uppercase tracking-widest">{sprint.duration} Day Intensive</p>
                            </div>
                        </div>

                        {/* Description */}
                        <section className="bg-white rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-gray-50 shadow-sm">
                            <h2 className="text-xs md:text-sm font-black text-primary uppercase tracking-[0.3em] mb-8">The Transformation</h2>
                            <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6">
                                <FormattedText text={sprint.description} className="font-medium" />
                            </div>
                        </section>

                        {/* Outcomes */}
                        <section>
                            <h2 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-8 px-2">Visible Milestones</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {outcomes.map((outcome, i) => (
                                    <div key={i} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-5 hover:border-primary/20 transition-all">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                        <p className="font-bold text-gray-800 pt-2 leading-snug">{outcome}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl lg:sticky lg:top-8 animate-fade-in">
                            <div className="text-center mb-8">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cycle Investment</p>
                                <h3 className="text-4xl md:text-5xl font-black text-dark tracking-tighter italic">
                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                </h3>
                            </div>

                            <Button onClick={handleJoinClick} isLoading={isEnrolling} className="w-full py-5 md:py-6 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 text-sm md:text-base">
                                {existingEnrollment ? 'Resume Journey' : 'Secure My Path'}
                            </Button>

                            <div className="mt-10 pt-10 border-t border-gray-50 flex flex-col items-center text-center">
                                <div className="relative mb-6">
                                    <img src={sprintCoach.profileImageUrl} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-gray-50 shadow-md" />
                                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-sm">
                                        <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Guided By</p>
                                <h4 className="text-lg font-black text-dark tracking-tight mb-1">{sprintCoach.name}</h4>
                                <p className="text-xs font-bold text-gray-400 uppercase">{sprintCoach.niche}</p>
                            </div>
                        </div>

                        {/* Social Proof Placeholder */}
                        <div className="bg-dark rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-yellow-400 text-lg">★</span>)}
                                </div>
                                <p className="text-lg font-medium italic leading-relaxed mb-8 opacity-90">
                                    "This 14-day cycle completely shifted how I view my professional value. The direct feedback was the catalyst I needed."
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                                    <div>
                                        <p className="font-bold text-sm">Jamie L.</p>
                                        <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">9-5 Professional</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
                        </div>
                    </aside>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;