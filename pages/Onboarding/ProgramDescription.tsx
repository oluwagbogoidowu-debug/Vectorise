
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { Sprint } from '../../types';
import FormattedText from '../../components/FormattedText';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-6`}>
      {children}
  </h2>
);

const ProgramDescription: React.FC = () => {
  const navigate = useNavigate();
  const { sprintId } = useParams();
  const location = useLocation();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Focus context from previous step
  const selectedFocus = location.state?.selectedFocus;

  useEffect(() => {
    const fetchSprint = async () => {
      if (!sprintId) return;
      setIsLoading(true);
      try {
        const data = await sprintService.getSprintById(sprintId);
        setSprint(data);
      } catch (err) {
        console.error("Error fetching sprint:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSprint();
  }, [sprintId]);

  const handleProceed = () => {
    if (!sprint) return;
    navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint, selectedFocus } });
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
        <Button onClick={() => navigate('/onboarding/focus-selector')} className="bg-white text-primary">Back to Focus</Button>
      </div>
    );
  }

  const isExecutionSprint = sprint.sprintType === 'Execution' || sprint.category.includes('Execution') || sprint.category.includes('Productivity');

  return (
    <div className="bg-light min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
      <div className="max-w-screen-lg mx-auto px-4 pt-2">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={() => navigate('/onboarding/focus-selector')} 
            className="group flex items-center text-gray-400 hover:text-primary transition-all text-[8px] font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 mr-1 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Refine Focus
          </button>
          <div className="px-2 py-0.5 rounded-md border border-primary/20 bg-primary/5 text-primary text-[7px] font-black uppercase tracking-widest">
            Registry Unlocked
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Hero Image Section */}
            <div className="relative h-[200px] sm:h-[280px] lg:h-[360px] rounded-2xl overflow-hidden shadow-lg group">
              <img 
                src={sprint.coverImageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80"} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={sprint.title} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-primary rounded text-[7px] font-black uppercase tracking-widest border border-white/10 shadow-lg">{sprint.category}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1 italic">
                  <FormattedText text={sprint.title} />
                </h1>
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-[0.3em]">{sprint.duration} Day Protocol</p>
              </div>
            </div>

            {/* Transformation Section */}
            <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm animate-fade-in">
              <SectionHeading>The Transformation</SectionHeading>
              <div className="space-y-6 text-gray-600 leading-relaxed text-[12px] font-medium">
                <p className="text-gray-900 font-bold text-lg leading-tight italic">
                  <FormattedText text={sprint.transformation || sprint.description} />
                </p>
                
                <div className="h-px bg-gray-50 my-6"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sprint.forWho && sprint.forWho.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">This sprint is for you if:</h4>
                      <ul className="space-y-2">
                          {sprint.forWho.map((item, i) => (
                              <li key={i} className="flex gap-2 items-start">
                                  <span className="text-primary mt-0.5 text-[10px]">●</span>
                                  <p className="text-[11px] italic font-medium leading-snug">{item}</p>
                              </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {sprint.notForWho && sprint.notForWho.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">This sprint is not for you if:</h4>
                      <ul className="space-y-2">
                          {sprint.notForWho.map((item, i) => (
                              <li key={i} className="flex gap-2 items-start opacity-60">
                                  <span className="text-red-400 mt-0.5 text-[10px]">✕</span>
                                  <p className="text-[11px] font-medium leading-snug">{item}</p>
                              </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Method Snapshot Section - Improved per user screenshot */}
            {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                <section className="bg-[#111827] text-white rounded-[2rem] p-8 md:p-12 relative overflow-hidden group shadow-2xl">
                    <SectionHeading color="primary">How This Sprint Works</SectionHeading>
                    <div className="relative z-10 space-y-10">
                        <div className="p-8 md:p-10 bg-white/[0.03] border border-white/5 rounded-[2.5rem] backdrop-blur-sm shadow-inner">
                            <p className="text-2xl md:text-3xl font-black text-white italic tracking-tight mb-10 leading-[1.1]">
                                For {sprint.duration} days, you’ll complete one focused action per day.
                            </p>
                            <div className="grid grid-cols-1 gap-8">
                                {sprint.methodSnapshot.map((item, i) => (
                                    <div key={i} className="space-y-1.5 group">
                                        <p className="text-[#0FB881] font-black uppercase text-[11px] tracking-[0.25em] group-hover:translate-x-1 transition-transform">
                                            {item.verb}
                                        </p>
                                        <p className="text-white/40 text-[11px] font-medium leading-relaxed italic max-w-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Decorative subtle pulse */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
                </section>
            )}

            {/* Outcomes Section */}
            {sprint.outcomes && sprint.outcomes.length > 0 && (
                <section className="bg-white rounded-2xl p-6 md:p-10 border border-gray-100 shadow-xl animate-fade-in">
                    <SectionHeading>By Day {sprint.duration}, You'll Have:</SectionHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 mt-6">
                        {sprint.outcomes.map((outcome, i) => (
                            <div key={i} className="flex items-start gap-4 group">
                                <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                                    ✓
                                </div>
                                <p className="font-bold text-gray-700 leading-snug text-[12px]">{outcome}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Closing */}
            <section className="py-12 text-center border-t border-gray-100">
                <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-6">The Outcome</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-6 px-4 italic">
                    <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                </h3>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-md lg:sticky lg:top-6">
              <div className="text-center mb-6">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <h3 className="text-2xl font-black text-dark tracking-tighter italic leading-none">
                  Registry Path
                </h3>
              </div>

              <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">📅</span>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Duration</p>
                          <p className="text-[10px] font-bold text-gray-900">{sprint.duration} Continuous Days</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">⚡</span>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Protocol</p>
                          <p className="text-[10px] font-bold text-gray-900">{sprint.protocol || 'One action per day'}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleProceed} 
                  className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[9px] uppercase tracking-widest font-black"
                >
                  Start This Sprint
                </Button>
                
                {!isExecutionSprint && (
                  <div className="text-center space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Are you already clear on what you want to do?</p>
                    <button 
                      onClick={() => navigate('/discover')}
                      className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Start Execution Sprint
                    </button>
                  </div>
                )}
              </div>

              {/* System Sprint Section */}
              <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)] border border-gray-100 transition-all hover:scale-110 active:scale-95 group">
                    <LocalLogo type="favicon" className="h-9 w-auto drop-shadow-sm" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-[7.5px] font-black text-primary uppercase tracking-[0.4em] leading-none mb-2">
                    System Sprint
                  </p>
                  <h4 className="text-[15px] font-black text-gray-900 tracking-tight leading-none italic mb-1.5">
                    Vectorise Protocol
                  </h4>
                  <div className="inline-block px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                    Level 01 Core
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ProgramDescription;
