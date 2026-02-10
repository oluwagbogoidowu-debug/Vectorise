import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { Sprint, MicroSelector, MicroSelectorStep, GlobalOrchestrationSettings } from '../../types';
import FormattedText from '../../components/FormattedText';

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
  <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.25em] mb-4`}>
      {children}
  </h2>
);

const ClaritySprintDescription: React.FC = () => {
  const navigate = useNavigate();
  const { sprintId } = useParams();
  const location = useLocation();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
  
  const [showMicroSelector, setShowMicroSelector] = useState(false);
  const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Focus context from previous step
  const selectedFocus = location.state?.selectedFocus;

  useEffect(() => {
    const fetchData = async () => {
      if (!sprintId) return;
      setIsLoading(true);
      try {
        const [sprintData, settings] = await Promise.all([
            sprintService.getSprintById(sprintId),
            sprintService.getGlobalOrchestrationSettings()
        ]);
        
        setSprint(sprintData);
        setGlobalSettings(settings);
        
        // Initial selector if defined for Foundation
        if (settings?.microSelectors) {
            const foundationSelector = settings.microSelectors.find(ms => ms.stage === 'Foundation');
            if (foundationSelector) setActiveSelector(foundationSelector);
        }

      } catch (err) {
        console.error("Error fetching sprint:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sprintId]);

  const handleProceed = () => {
    if (!sprint) return;
    navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint, selectedFocus } });
  };

  const handleSkipClarity = () => {
      // Navigate to the same FocusSelector file but with the 'skip_clarity' trigger context
      navigate('/onboarding/focus-selector', { 
          state: { 
              trigger: 'skip_clarity',
              fromClaritySprintId: sprintId 
          } 
      });
  };

  const handleOptionClick = (option: any) => {
    if (option.action === 'next_step') {
        setCurrentStepIdx(currentStepIdx + 1);
    } else if (option.action === 'skip_to_stage') {
        navigate('/onboarding/commitment', { 
            state: { 
                skipToExecution: true, 
                targetStage: option.value,
                sprintType: 'Execution Sprint'
            } 
        });
    } else if (option.action === 'finish_and_recommend') {
        navigate('/discover');
    }
  };

  const closeSelector = () => {
    setShowMicroSelector(false);
    setCurrentStepIdx(0);
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
        <h1 className="text-2xl font-black mb-4">Foundation Not Found</h1>
        <Button onClick={() => navigate('/onboarding/focus-selector')} className="bg-white text-primary">Back to Focus</Button>
      </div>
    );
  }

  const currentStep = activeSelector?.steps[currentStepIdx];

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
            Phase 01: Core
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="relative h-[200px] sm:h-[280px] lg:h-[360px] rounded-2xl overflow-hidden shadow-lg group">
              <img src={sprint.coverImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={sprint.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-primary rounded text-[7px] font-black uppercase tracking-widest border border-white/10 shadow-lg">Foundational Path</span>
                  <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[7px] font-black uppercase tracking-widest border border-white/10">Action-Based</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1 italic">
                  <FormattedText text={sprint.title} />
                </h1>
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-[0.3em]">{sprint.duration} Day Protocol</p>
              </div>
            </div>

            {selectedFocus && (
              <div className="bg-[#0FB881]/10 border border-[#0FB881]/20 rounded-2xl px-6 py-4 flex items-center justify-between animate-fade-in shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg">🎯</div>
                      <div>
                          <p className="text-[8px] font-black text-[#0FB881] uppercase tracking-[0.2em] mb-0.5">Optimized Match</p>
                          <p className="text-xs font-bold text-gray-700 italic">"{selectedFocus}"</p>
                      </div>
                  </div>
                  <span className="text-[7px] font-black bg-white px-2 py-0.5 rounded border border-gray-100 uppercase tracking-widest text-gray-400">Validated</span>
              </div>
            )}

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
                              <li key={i} className="flex gap-2 items-start"><span className="text-primary mt-0.5 text-[10px]">●</span><p className="text-[11px] italic font-medium leading-snug">{item}</p></li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {sprint.notForWho && sprint.notForWho.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">This sprint is not for you if:</h4>
                      <ul className="space-y-2">
                          {sprint.notForWho.map((item, i) => (
                              <li key={i} className="flex gap-2 items-start opacity-60"><span className="text-red-400 mt-0.5 text-[10px]">✕</span><p className="text-[11px] font-medium leading-snug">{item}</p></li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                <section className="bg-dark text-white rounded-2xl p-8 relative overflow-hidden group shadow-xl">
                    <SectionHeading color="primary">How This Sprint Works</SectionHeading>
                    <div className="relative z-10 space-y-6">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-lg font-black text-white italic tracking-tight mb-4">For {sprint.duration} days, you’ll complete one focused action per day.</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {sprint.methodSnapshot.map((item, i) => (
                                    <div key={i} className="space-y-1">
                                        <p className="text-primary font-black uppercase text-[9px] tracking-widest">{item.verb}</p>
                                        <p className="text-[10px] text-white/40 leading-tight">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                </section>
            )}

            {sprint.outcomes && sprint.outcomes.length > 0 && (
                <section className="bg-white rounded-2xl p-6 md:p-10 border border-gray-100 shadow-xl animate-fade-in">
                    <SectionHeading>By Day {sprint.duration}, You'll Have:</SectionHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 mt-6">
                        {sprint.outcomes.map((outcome, i) => (
                            <div key={i} className="flex items-start gap-4 group">
                                <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">✓</div>
                                <p className="font-bold text-gray-700 leading-snug text-[12px]">{outcome}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="py-12 text-center border-t border-gray-100">
                <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-6">The Outcome</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-6 px-4 italic">
                    <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
                </h3>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-md lg:sticky lg:top-6">
              <div className="text-center mb-6">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <h3 className="text-2xl font-black text-dark tracking-tighter italic leading-none">Foundational</h3>
              </div>
              <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">📅</span>
                      <div><p className="text-[8px] font-black text-gray-400 uppercase">Duration</p><p className="text-[10px] font-bold text-gray-900">{sprint.duration} Continuous Days</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">⚡</span>
                      <div><p className="text-[8px] font-black text-gray-400 uppercase">Protocol</p><p className="text-[10px] font-bold text-gray-900">{sprint.protocol || 'One action per day'}</p></div>
                  </div>
              </div>
              <div className="space-y-4">
                <Button onClick={handleProceed} className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[9px] uppercase tracking-widest font-black">Start This Sprint</Button>
                <div className="text-center space-y-1">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Are you already clear on what you want to do?</p>
                  <button onClick={handleSkipClarity} className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest transition-all cursor-pointer">Start Execution Sprint</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showMicroSelector && activeSelector && currentStep && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm shadow-2xl relative animate-slide-up">
            <header className="text-center mb-10">
              <LocalLogo type="favicon" className="h-10 w-auto mx-auto mb-6 opacity-40" />
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight italic leading-tight px-2">{currentStep.question}</h2>
            </header>
            <div className="space-y-3">
              {currentStep.options.map((opt, idx) => (
                <button key={idx} onClick={() => handleOptionClick(opt)} className="w-full group relative overflow-hidden bg-gray-50 border border-gray-100 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center">
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">{opt.label}</span>
                </button>
              ))}
            </div>
            <button onClick={closeSelector} className="w-full mt-8 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors">Cancel & View Path</button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ClaritySprintDescription;