
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Hero Image Section */}
            <div className="relative h-[220px] sm:h-[300px] lg:h-[380px] rounded-[2.5rem] overflow-hidden shadow-2xl group border-4 border-white">
              <img 
                src={sprint.coverImageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80"} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={sprint.title} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10 shadow-lg">{sprint.category}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-2 italic">
                  <FormattedText text={sprint.title} />
                </h1>
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-[0.4em]">{sprint.duration} Day Protocol</p>
              </div>
            </div>

            {/* ENHANCED Transformation Section */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="relative z-10">
                <SectionHeading>The Transformation</SectionHeading>
                <div className="space-y-8">
                  <p className="text-gray-900 font-black text-2xl md:text-3xl leading-[1.15] italic tracking-tight">
                    <FormattedText text={sprint.transformation || sprint.description} />
                  </p>
                  
                  <div className="h-px bg-gray-100 w-24"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {sprint.forWho && sprint.forWho.length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <span className="w-1 h-3 bg-primary rounded-full"></span>
                           Ideal For You If
                        </h4>
                        <ul className="space-y-3">
                            {sprint.forWho.map((item, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <span className="text-primary mt-1 flex-shrink-0">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </span>
                                    <p className="text-[12px] italic font-semibold text-gray-600 leading-snug">{item}</p>
                                </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    {sprint.notForWho && sprint.notForWho.length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-1 h-3 bg-red-400 rounded-full"></span>
                          This Is Not For You If
                        </h4>
                        <ul className="space-y-3 opacity-60">
                            {sprint.notForWho.map((item, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <span className="text-red-400 mt-1 flex-shrink-0">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </span>
                                    <p className="text-[12px] font-semibold text-gray-500 leading-snug">{item}</p>
                                </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Subtle background flair */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/2 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            </section>

            {/* ENHANCED Method Snapshot Section - High-Fidelity UI */}
            {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                <section className="bg-[#0A0F1D] text-white rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden shadow-2xl border border-white/5 group">
                    {/* Visual Enhancements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-64 transition-opacity duration-1000 group-hover:opacity-100 opacity-60"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>
                    
                    <div className="relative z-10">
                        <SectionHeading color="[#0FB881]">How This Sprint Works</SectionHeading>
                        
                        <div className="mt-8 space-y-12">
                            <p className="text-3xl md:text-[42px] font-black text-white italic tracking-tighter leading-[1] mb-14">
                                For {sprint.duration} days, you’ll complete one <span className="text-[#0FB881]">focused action</span> per day.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                {sprint.methodSnapshot.map((item, i) => (
                                    <div key={i} className="space-y-3 group/item">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-black text-white/20 italic">0{i+1}</span>
                                          <p className="text-[#0FB881] font-black uppercase text-[12px] tracking-[0.3em] transition-all duration-300 group-hover/item:tracking-[0.4em] group-hover/item:text-[#10e6a1]">
                                              {item.verb}
                                          </p>
                                        </div>
                                        <p className="text-white/50 text-[13px] font-medium leading-relaxed italic transition-colors group-hover/item:text-white/80">
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
                <section className="bg-white rounded-[2.5rem] p-10 md:p-14 border border-gray-100 shadow-xl animate-fade-in relative overflow-hidden">
                    <SectionHeading>Evidence of Completion</SectionHeading>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">By Day {sprint.duration}, You'll Have:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 relative z-10">
                        {sprint.outcomes.map((outcome, i) => (
                            <div key={i} className="flex items-start gap-5 group">
                                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                    ✓
                                </div>
                                <p className="font-black text-gray-800 leading-tight text-sm italic">{outcome}</p>
                            </div>
                        ))}
                    </div>
                    {/* Subtle pattern or logo */}
                    <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.02] scale-[2.5] pointer-events-none">
                      <LocalLogo type="favicon" className="w-48 h-48" />
                    </div>
                </section>
            )}

            {/* Closing */}
            <section className="py-16 text-center border-t border-gray-100">
                <SectionHeading>The Outcome</SectionHeading>
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.1] tracking-tighter px-4 italic max-w-2xl mx-auto">
                    <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                </h3>
            </section>
          </div>

          {/* ENHANCED Sidebar Area */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl lg:sticky lg:top-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20"></div>
              
              <div className="text-center mb-10">
                <SectionHeading>Registry Status</SectionHeading>
                <h3 className="text-3xl font-black text-dark tracking-tighter italic leading-none">
                  Registry Path
                </h3>
              </div>

              <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">📅</div>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Timeline</p>
                          <p className="text-[12px] font-black text-gray-900 leading-none">{sprint.duration} Continuous Days</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 group transition-all hover:bg-white hover:border-primary/20 hover:shadow-md">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">⚡</div>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Execution Mode</p>
                          <p className="text-[12px] font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-5">
                <Button 
                  onClick={handleProceed} 
                  className="w-full py-5 rounded-[1.5rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black"
                >
                  Authorize Path &rarr;
                </Button>
                
                {!isExecutionSprint && (
                  <div className="text-center space-y-2 pt-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-4 leading-relaxed">Already clear on your direction?</p>
                    <button 
                      onClick={() => navigate('/discover')}
                      className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest transition-all cursor-pointer bg-primary/5 px-4 py-2 rounded-xl"
                    >
                      Skip to Execution
                    </button>
                  </div>
                )}
              </div>

              {/* System Sprint Section */}
              <div className="mt-12 pt-10 border-t border-gray-50 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-gray-100 transition-all hover:scale-105 group relative">
                    <LocalLogo type="favicon" className="h-12 w-auto drop-shadow-sm" />
                    <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse"></div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-primary uppercase tracking-[0.5em] leading-none mb-2">
                    Vectorise Protocol
                  </p>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none italic">
                    Certified Registry
                  </h4>
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
