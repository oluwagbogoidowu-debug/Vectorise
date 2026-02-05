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

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light text-[8px] font-black uppercase tracking-[0.2em] text-gray-300">Cataloging...</div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-base font-black mb-2">Path Not Found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

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
        <div className="bg-light min-h-screen font-sans text-[13px] pb-12">
            <div className="max-w-screen-lg mx-auto px-4 pt-2">
                
                {/* Top Nav - Even tighter */}
                <div className="flex justify-between items-center mb-3">
                    <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-400 hover:text-primary transition-all text-[8px] font-black uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 mr-1 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    {!existingEnrollment && (
                        <button className={`px-2 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20'}`}>
                            {isSaved ? 'Bookmarked' : 'Save Path'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-3">
                        
                        {/* Hero Card - Highly optimized height */}
                        <div className="relative h-[150px] sm:h-[220px] lg:h-[300px] rounded-xl overflow-hidden shadow-md group">
                            <img src={sprint.coverImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/10 to-transparent"></div>
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    <span className="px-1 py-0.5 bg-primary rounded text-[6px] font-black uppercase tracking-widest border border-white/10">{sprint.category}</span>
                                    <span className="px-1 py-0.5 bg-white/10 backdrop-blur-md rounded text-[6px] font-black uppercase tracking-widest border border-white/10">{sprint.difficulty}</span>
                                </div>
                                <h1 className="text-lg md:text-2xl font-black tracking-tight leading-tight mb-0.5">
                                    <FormattedText text={sprint.title} />
                                </h1>
                                <p className="text-white/60 text-[7px] font-bold uppercase tracking-widest">{sprint.duration} Day Intensive</p>
                            </div>
                        </div>

                        {/* Description - Tightened */}
                        <section className="bg-white rounded-xl p-4 md:p-6 border border-gray-50 shadow-sm">
                            <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-3">The Transformation</h2>
                            <div className="text-gray-600 leading-relaxed space-y-2 text-[11px] sm:text-[12px] font-medium">
                                <FormattedText text={sprint.description} />
                            </div>
                        </section>

                        {/* Outcomes */}
                        <section>
                            <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Visible Milestones</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {outcomes.map((outcome, i) => (
                                    <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-start gap-2.5">
                                        <div className="w-5 h-5 bg-primary/5 text-primary rounded-md flex items-center justify-center flex-shrink-0 text-[9px]">✓</div>
                                        <p className="font-bold text-gray-800 pt-0.5 leading-snug text-[11px]">{outcome}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar - Condensed */}
                    <aside className="lg:col-span-4 space-y-3">
                        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-100 shadow-md lg:sticky lg:top-3">
                            <div className="text-center mb-4">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Cycle Investment</p>
                                <h3 className="text-xl font-black text-dark tracking-tighter italic leading-none">
                                    {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                </h3>
                            </div>

                            <Button onClick={handleJoinClick} isLoading={isEnrolling} className="w-full py-2.5 rounded-lg shadow-sm text-[8px] uppercase tracking-widest">
                                {existingEnrollment ? 'Resume Journey' : 'Secure My Path'}
                            </Button>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col items-center text-center">
                                <img src={sprintCoach.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gray-50 shadow-sm mb-2" />
                                <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">Guided By</p>
                                <h4 className="text-[12px] font-black text-dark tracking-tight leading-none mb-0.5">{sprintCoach.name}</h4>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{sprintCoach.niche}</p>
                            </div>
                        </div>

                        {/* Minimal Proof */}
                        <div className="bg-dark rounded-xl p-4 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[11px] font-medium italic leading-relaxed opacity-90 mb-3">
                                    "A complete shift in my professional value. Direct feedback was the catalyst I needed."
                                </p>
                                <p className="font-bold text-[8px] uppercase tracking-widest text-primary/80">Jamie L.</p>
                            </div>
                            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary/10 rounded-full blur-xl"></div>
                        </div>
                    </aside>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SprintLandingPage;