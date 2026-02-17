import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { Sprint, Participant, ParticipantSprint } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import FormattedText from '../../components/FormattedText';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
      {children}
  </h2>
);

const ProgramDescription: React.FC = () => {
  const navigate = useNavigate();
  const { sprintId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const selectedFocus = location.state?.selectedFocus;
  const activeTrigger = location.state?.trigger || 'after_homepage';

  const fallbackImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80";

  useEffect(() => {
    const fetchData = async () => {
      if (!sprintId) return;
      setIsLoading(true);
      try {
        const data = await sprintService.getSprintById(sprintId);
        setSprint(data);
        if (user) {
            const enrollments = await sprintService.getUserEnrollments(user.id);
            setUserEnrollments(enrollments);
        }
      } catch (err) {
        console.error("Error fetching sprint:", err);
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

  const handleProceed = () => {
    if (!sprint) return;
    navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint, selectedFocus, trigger: activeTrigger } });
  };

  const handleRefineFocus = () => {
    navigate('/onboarding/focus-selector', { state: { trigger: activeTrigger } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center text-white">
        <h1 className="text-2xl font-black mb-4">Program Not Found</h1>
        <Button onClick={handleRefineFocus} className="bg-white text-primary">Back to Focus</Button>
      </div>
    );
  }

  const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';

  return (
    <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
      <div className="max-w-screen-lg mx-auto px-4 pt-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={handleRefineFocus} 
            className="group flex items-center text-gray-400 hover:text-primary transition-all text-[9px] font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Refine Focus
          </button>
          <div className="px-4 py-1.5 rounded-xl border border-[#D3EBE3] bg-white text-[#159E6A] text-[9px] font-black uppercase tracking-widest">
            PHASE 01: CORE
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* HERO SECTION */}
            <div className="relative h-[260px] sm:h-[320px] lg:h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl group border-4 border-white bg-dark">
              <img 
                src={imageError || !sprint.coverImageUrl ? fallbackImage : sprint.coverImageUrl} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={sprint.title} 
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <div className="mb-4">
                  <span className="px-3 py-1.5 bg-[#0E7850] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                    {isFoundational ? 'FOUNDATIONAL PATH' : 'FOUNDATION PATH'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1] mb-2 italic">
                  <FormattedText text={sprint.title} />
                </h1>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em]">{sprint.duration} DAY PROTOCOL</p>
              </div>
            </div>

            {/* TRANSFORMATION SECTION */}
            <section className="bg-white rounded-[2.5rem] p-10 md:p-14 border border-gray-100 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="relative z-10">
                <SectionHeading>The Transformation</SectionHeading>
                <div className="space-y-10">
                  <p className="text-gray-900 font-bold text-sm leading-relaxed italic">
                    <FormattedText text={sprint.transformation || sprint.description} />
                  </p>
                  <div className="h-px bg-gray-50 w-24"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {sprint.forWho && sprint.forWho.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <span className="w-1 h-3 bg-primary rounded-full"></span>
                           Ideal For You If
                        </h4>
                        <ul className="space-y-3">
                          {sprint.forWho.map((item, i) => (
                            <li key={i} className="flex gap-4 items-start">
                              <span className="text-primary mt-1 flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </span>
                              <p className="text-sm italic font-semibold text-gray-600 leading-snug">{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sprint.notForWho && sprint.notForWho.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <span className="w-1 h-3 bg-red-400 rounded-full"></span>
                           Not For You If
                        </h4>
                        <ul className="space-y-3 opacity-70">
                          {sprint.notForWho.map((item, i) => (
                            <li key={i} className="flex gap-4 items-start">
                              <span className="text-red-400 mt-1 flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </span>
                              <p className="text-sm italic font-semibold text-gray-500 leading-snug">{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* METHOD SECTION */}
            {sprint.methodSnapshot && sprint.methodSnapshot.some(m => m.verb.trim()) && (
              <section className="bg-dark text-white rounded-[3rem] p-10 md:p-14 relative overflow-hidden shadow-2xl">
                 <div className="relative z-10">
                    <SectionHeading color="primary">The Protocol</SectionHeading>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                      {sprint.methodSnapshot.map((item, i) => (
                        <div key={i} className="space-y-3">
                          <p className="text-primary font-black uppercase text-[11px] tracking-widest">0{i+1} {item.verb}</p>
                          <p className="text-white/60 text-[12px] font-medium leading-relaxed italic">"{item.description}"</p>
                        </div>
                      ))}
                    </div>
                 </div>
              </section>
            )}

            {/* OUTCOMES SECTION */}
            {sprint.outcomes && sprint.outcomes.length > 0 && (
              <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden">
                <SectionHeading>Evidence of Completion</SectionHeading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  {sprint.outcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5 shadow-sm">✓</div>
                      <p className="font-black text-gray-700 leading-snug text-sm italic">{outcome}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FINAL STATEMENT */}
            <section className="py-16 text-center border-t border-gray-100">
                <h3 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tighter px-6 italic max-w-2xl mx-auto">
                    <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                </h3>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl lg:sticky lg:top-8 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary/20"></div>
              <div className="text-center mb-12">
                <SectionHeading>Sprint Status</SectionHeading>
                {enrollmentStatus === 'none' && (
                    <h3 className="text-3xl font-black text-dark tracking-tighter italic leading-none">Securing Path</h3>
                )}
                {enrollmentStatus === 'active' && (
                    <div className="bg-green-50 text-green-600 px-4 py-2 rounded-2xl border border-green-100 inline-block font-black uppercase text-[10px] tracking-widest animate-pulse">In Progress</div>
                )}
                {enrollmentStatus === 'queued' && (
                    <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl border border-blue-100 inline-block font-black uppercase text-[10px] tracking-widest">In Upcoming Queue</div>
                )}
                {enrollmentStatus === 'completed' && (
                    <div className="bg-gray-50 text-gray-400 px-4 py-2 rounded-2xl border border-gray-100 inline-block font-black uppercase text-[10px] tracking-widest">Mastered</div>
                )}
              </div>

              <div className="space-y-6 mb-12">
                  <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">📅</div>
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Timeline</p>
                          <p className="text-sm font-black text-gray-900 leading-none">{sprint.duration} Continuous Days</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">⚡</div>
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Execution</p>
                          <p className="text-sm font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                {enrollmentStatus === 'none' ? (
                    <Button onClick={handleProceed} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black">Authorize Path &rarr;</Button>
                ) : enrollmentStatus === 'active' ? (
                    <Button onClick={() => navigate(`/participant/sprint/${activeEnrollmentId}`)} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black bg-green-600 border-none">Back to Sprint &rarr;</Button>
                ) : (
                    <Button onClick={() => navigate('/my-sprints')} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black bg-blue-600 border-none">View in My Sprints &rarr;</Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProgramDescription;