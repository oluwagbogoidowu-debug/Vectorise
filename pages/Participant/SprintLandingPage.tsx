import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { Coach, Sprint, Participant, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { analyticsTracker } from '../../services/analyticsTracker';
import FormattedText from '../../components/FormattedText';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';

import { Calendar, Zap, CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
      {children}
  </h2>
);

const SprintLandingPage: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    
    const fallbackImage = assetService.URLS.DEFAULT_SPRINT_COVER;
    const selectedFocus = location.state?.selectedFocus;

    useEffect(() => {
        const fetchData = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
                
                if (data) {
                    const dbCoach = await userService.getUserDocument(data.coachId);
                    setFetchedCoach(dbCoach as Coach);
                    
                    // Analytics: Track view
                    analyticsTracker.trackEvent('landing_viewed', { 
                        sprint_id: sprintId, 
                        title: data.title,
                        category: data.category
                    }, user?.id);
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

    const enrollmentStatus = useMemo(() => {
        if (!user || !sprint) return 'none';
        const enrollment = userEnrollments.find(e => e.sprint_id === sprint.id);
        if (enrollment) {
            return enrollment.status === 'active' ? 'active' : 'completed';
        }
        const p = user as Participant;
        if (p.savedSprintIds?.includes(sprint.id)) return 'queued';
        return 'none';
    }, [user, sprint, userEnrollments]);

    const activeEnrollmentId = useMemo(() => {
        if (!sprint) return null;
        return userEnrollments.find(e => e.sprint_id === sprint.id)?.id || null;
    }, [userEnrollments, sprint]);

    const handleJoinClick = () => {
        if (!sprint) return;
        analyticsTracker.trackEvent('sprint_intent_captured', { sprint_id: sprintId }, user?.id);
        navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint, selectedFocus } });
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light text-[8px] font-black uppercase tracking-[0.2em] text-gray-300">Synchronizing registry...</div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-base font-black mb-2">Registry item not found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

    const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';

    return (
        <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
            <div className="max-w-screen-lg mx-auto px-4 pt-4">
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={() => navigate('/discover')} 
                        className="group flex items-center text-gray-400 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registry
                    </button>
                    <div className="px-4 py-1.5 rounded-xl border border-[#D3EBE3] bg-white text-[#159E6A] text-[9px] font-black uppercase tracking-widest">
                        {isFoundational ? 'FOUNDATIONAL PATH' : 'FOUNDATION PATH'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* HERO SECTION */}
                        <div className="relative h-[280px] sm:h-[340px] lg:h-[440px] rounded-[3rem] overflow-hidden shadow-2xl group border-4 border-white bg-dark">
                            <img 
                                src={imageError || !sprint.coverImageUrl ? fallbackImage : sprint.coverImageUrl} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                alt={sprint.title} 
                                onError={() => setImageError(true)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
                            <div className="absolute bottom-10 left-10 right-10 text-white">
                                <div className="mb-4">
                                    <span className="px-3 py-1.5 bg-[#0E7850] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                                        {isFoundational ? 'FOUNDATIONAL PATH' : 'PREMIUM SPRINT'}
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-2">
                                    <FormattedText text={sprint.title} inline />
                                </h1>
                                {sprint.subtitle && (
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.4em] mb-4 leading-none">{sprint.subtitle}</p>
                                )}
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.4em]">{sprint.duration} DAY PROTOCOL</p>
                            </div>
                        </div>

                        {sprint.dynamicSections && sprint.dynamicSections.map((section, index) => (
                            <section key={index} className="bg-white rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-gray-100 shadow-sm animate-fade-in">
                                <SectionHeading>{section.title}</SectionHeading>
                                <DynamicSectionRenderer section={section} />
                            </section>
                        ))}
                    </div>

                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] lg:sticky lg:top-8 overflow-hidden relative group/card">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
                            
                            {/* Decorative Background Element */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover/card:bg-primary/10 transition-colors duration-700"></div>

                            <div className="text-center mb-10 relative z-10">
                                <SectionHeading>Sprint Status</SectionHeading>
                                {enrollmentStatus === 'none' && (
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-1">
                                            {sprint.pricingType === 'credits' ? `🪙 ${sprint.pointCost}` : `₦${sprint.price.toLocaleString()}`}
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Access</p>
                                    </div>
                                )}
                                {enrollmentStatus === 'active' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest animate-pulse shadow-sm">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                            In Progress
                                        </div>
                                    </div>
                                )}
                                {enrollmentStatus === 'queued' && (
                                    <div className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-2xl border border-blue-100 inline-flex items-center gap-2 font-black uppercase text-[10px] tracking-widest shadow-sm">
                                        <Clock className="w-3 h-3" />
                                        In Upcoming Queue
                                    </div>
                                )}
                                {enrollmentStatus === 'completed' && (
                                    <div className="bg-gray-50 text-gray-400 px-5 py-2.5 rounded-2xl border border-gray-100 inline-flex items-center gap-2 font-black uppercase text-[10px] tracking-widest shadow-sm">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Mastered
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-10 relative z-10">
                                <div className="flex items-center gap-5 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 group/item transition-all hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-gray-100 transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Timeline</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">{sprint.duration} Continuous Days</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 group/item transition-all hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-gray-100 transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Execution</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 relative z-10">
                                {enrollmentStatus === 'none' ? (
                                    <Button onClick={handleJoinClick} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black group/btn">
                                        Authorize Path 
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                ) : enrollmentStatus === 'active' ? (
                                    <Button onClick={() => navigate(`/participant/sprint/${activeEnrollmentId}`)} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black bg-emerald-600 border-none group/btn">
                                        Back to Sprint 
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                ) : (
                                    <Button onClick={() => navigate('/my-sprints')} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black bg-blue-600 border-none group/btn">
                                        View in My Sprints 
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                )}
                                
                                <div className="flex items-center justify-center gap-2 pt-2 opacity-40 group-hover/card:opacity-60 transition-opacity">
                                    <ShieldCheck className="w-3 h-3 text-gray-400" />
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Secure Protocol</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SprintLandingPage;