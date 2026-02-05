import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MOCK_USERS } from '../../services/mockData';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, UserRole, Participant, Sprint, Review, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
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
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    
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

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light text-xs font-bold uppercase tracking-widest text-gray-300">Syncing Catalog...</div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-xl font-black mb-4">Program not found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

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
        <div className="bg-light min-h-screen font-sans text-base pb-24">
            <div className="max-w-screen-lg mx-auto px-4 pt-4">
                
                {/* Top Nav - Compact */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-400 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    {!existingEnrollment && (
                        <button className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20'}`}>
                            {isSaved ? 'Bookmarked' : 'Save Path'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Hero Card - Reduced height */}
                        <div className="relative h-[220px] sm:h-[300px] lg:h-[400px] rounded-3xl overflow-hidden shadow-xl group">
                            <img src={sprint.coverImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/10 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 right-6 text-white">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="px-2 py-0.5 bg-primary rounded text-[8px] font-black uppercase tracking-widest border border-white/20">{sprint.category}</span>
                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest border border-white/20">{sprint.difficulty}</span>
                                </div>
                                <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-1">
                                    <FormattedText text={sprint.title} />
                                </h1>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{sprint.duration} Day Intensive</p>
                            </div>
                        </div>

                        {/* Description - Tightened padding */}
                        <section className="bg-white rounded-3xl p-6 md:p-10 border border-gray-50 shadow-sm">
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6">The Transformation</h2>
                            <div className="text-gray-600 leading-relaxed space-y-4 text-sm md:text-base font-medium">
                                <FormattedText text={sprint.description} />
                            </div>
                        </section>

                        {/* Outcomes */}
                        <section>
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Visible Milestones</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {outcomes.map((outcome, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                                        <div className="w-8 h-8 bg-primary/5 text-primary rounded-xl flex items-center justify-center flex-shrink-0 text-sm">✓</div>
                                        <p className="font-bold text-gray-800 pt-1.5 leading-snug text-sm">{outcome}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-lg lg:sticky lg:top-6">
                            <div className="text-center mb-6">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cycle Investment</p>
                                <h3 className="text-3xl font-black text-dark tracking-tighter italic">
                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                </h3>
                            </div>

                            <Button onClick={handleJoinClick} isLoading={isEnrolling} className="w-full py-4 rounded-xl shadow-lg shadow-primary/10 text-xs uppercase tracking-widest">
                                {existingEnrollment ? 'Resume Journey' : 'Secure My Path'}
                            </Button>

                            <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col items-center text-center">
                                <img src={sprintCoach.profileImageUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-50 shadow-sm mb-4" />
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Guided By</p>
                                <h4 className="text-base font-black text-dark tracking-tight leading-none mb-1">{sprintCoach.name}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{sprintCoach.niche}</p>
                            </div>
                        </div>

                        {/* Minimal Social Proof */}
                        <div className="bg-dark rounded-3xl p-6 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex gap-0.5 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}
                                </div>
                                <p className="text-sm font-medium italic leading-relaxed opacity-90 mb-6">
                                    "A complete shift in my professional value. The direct feedback was the catalyst I needed."
                                </p>
                                <p className="font-bold text-xs">Jamie L.</p>
                            </div>
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
                        </div>
                    </aside>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;