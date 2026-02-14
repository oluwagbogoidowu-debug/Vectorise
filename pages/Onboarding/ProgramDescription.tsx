
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
    <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
      <div className="max-w-screen-lg mx-auto px-4 pt-4">
        
        {/* Top Navigation - Matches Screenshot */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/onboarding/focus-selector')} 
            className="group flex items-center text-gray-400 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Refine Focus
          </button>
          <div className="px-4 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest">
            PHASE 01: CORE
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Hero Image Section - Optimized to match Screenshot exactly */}
            <div className="relative h-[280px] sm:h-[340px] lg:h-[440px] rounded-[3rem] overflow-hidden shadow-2xl group">
              <img 
                src={sprint.coverImageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80"} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={sprint.title} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/10 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <div className="mb-4">
                  <span className="px-3 py-1.5 bg-[#0E7850] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                    FOUNDATIONAL PATH
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95] mb-4 italic">
                  <FormattedText text={sprint.title} />
                </h1>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.4em]">{sprint.duration} DAY PROTOCOL</p>
              </div>
            </div>

            {/* Optimized Match Card - Exact UI from Screenshot */}
            {selectedFocus && (
              <div className="bg-[#E7F5F0] border border-[#D3EBE3] rounded-[2.5rem] px-8 py-6 flex items-center justify-between animate-fade-in shadow-sm">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl">
                        <img src="https://em-content.zobj.net/source/apple/354/bullseye_1f3af.png" className="w-8 h-8" alt="target" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-[#159E6A] uppercase tracking-[0.25em] mb-1">Optimized Match</p>
                          <p className="text-[15px] font-bold text-gray-700 italic leading-none">"{selectedFocus}"</p>
                      </div>
                  </div>
                  <span className="text-[9px] font-black bg-white px-4 py-2 rounded-xl text-gray-400 uppercase tracking-widest shadow-sm">Validated</span>
              </div>
            )}

            {/* ENHANCED Transformation Section - Consistency changes */}
            <section className="bg-white rounded-[2.5rem] p-10 md:p-14 border border-gray-100 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="relative z-10">
                <SectionHeading>The Transformation</SectionHeading>
                <div className="space-y-10">
                  {/* Fixed Size, Removed Italics as requested */}
                  <p className="text-gray-900 font-bold text-sm leading-relaxed">
                    <FormattedText text={sprint.transformation || sprint.description} />
                  </p>
                  
                  <div className="h-px bg-gray-100 w-24"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {sprint.forWho && sprint.forWho.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                           <span className="w-1 h-3 bg-primary rounded-full"></span>
                           Ideal For You If
                        </h4>
                        <ul className="space-y-4">
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
                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                          <span className="w-1 h-3 bg-red-400 rounded-full"></span>
                          This Is Not For You If
                        </h4>
                        <ul className="space-y-4 opacity-60">
                            {sprint.notForWho.map((item, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                    <span className="text-red-400 mt-1 flex-shrink-0">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </span>
                                    <p className="text-sm font-semibold text-gray-500 leading-snug">{item}</p>
                                </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ENHANCED Method Snapshot Section - Green Background as requested */}
            {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                <section className="bg-primary text-white rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl border border-white/5 group">
                    {/* Visual Enhancements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -mr-64 -mt-64 transition-opacity duration-1000 group-hover:opacity-100 opacity-60"></div>
                    
                    <div className="relative z-10">
                        <SectionHeading color="white/40">How This Sprint Works</SectionHeading>
                        
                        <div className="mt-8 space-y-12">
                            <p className="text-3xl md:text-[46px] font-black text-white italic tracking-tighter leading-[1] mb-16">
                                For {sprint.duration} days, you’ll complete one <span className="text-[#0FB881] drop-shadow-[0_0_10px_rgba(15,184,129,0.3)]">focused action</span> per day.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {sprint.methodSnapshot.map((item, i) => (
                                    <div key={i} className="space-y-4 group/item">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[12px] font-black text-white/30 italic">0{i+1}</span>
                                          <p className="text-white font-black uppercase text-sm tracking-[0.3em] transition-all duration-300">
                                              {item.verb}
                                          </p>
                                        </div>
                                        <p className="text-white/70 text-sm font-medium leading-relaxed italic transition-colors group-hover/item:text-white">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Outcomes Section */}
            {sprint.outcomes && sprint.outcomes.length > 0 && (
                <section className="bg-white rounded-[2.5rem] p-12 md:p-16 border border-gray-100 shadow-xl animate-fade-in relative overflow-hidden">
                    <SectionHeading>Evidence of Completion</SectionHeading>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-12">By Day {sprint.duration}, You'll Have:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-16 relative z-10">
                        {sprint.outcomes.map((outcome, i) => (
                            <div key={i} className="flex items-start gap-6 group">
                                <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-[11px] shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                    ✓
                                </div>
                                <p className="font-black text-gray-800 leading-tight text-base italic">{outcome}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Closing */}
            <section className="py-20 text-center border-t border-gray-100">
                <SectionHeading>The Outcome</SectionHeading>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tighter px-4 italic max-w-2xl mx-auto">
                    <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                </h3>
            </section>
          </div>

          {/* ENHANCED Sidebar Area */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl lg:sticky lg:top-8 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary/20"></div>
              
              <div className="text-center mb-12">
                <SectionHeading>Registry Status</SectionHeading>
                <h3 className="text-3xl font-black text-dark tracking-tighter italic leading-none">
                  Registry Path
                </h3>
              </div>

              <div className="space-y-5 mb-12">
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
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Execution Mode</p>
                          <p className="text-sm font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                <Button 
                  onClick={handleProceed} 
                  className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-sm uppercase tracking-[0.25em] font-black"
                >
                  Authorize Path &rarr;
                </Button>
                
                {!isExecutionSprint && (
                  <div className="text-center space-y-3 pt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 leading-relaxed">Already clear on your direction?</p>
                    <button 
                      onClick={() => navigate('/discover')}
                      className="text-[11px] font-black text-primary hover:underline uppercase tracking-widest transition-all cursor-pointer bg-primary/5 px-6 py-3 rounded-2xl"
                    >
                      Skip to Execution
                    </button>
                  </div>
                )}
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
