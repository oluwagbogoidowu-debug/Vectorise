
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { Sprint, MicroSelector, MicroSelectorStep, GlobalOrchestrationSettings } from '../../types';
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

const ClaritySprintDescription: React.FC = () => {
  const navigate = useNavigate();
  const { sprintId } = useParams();
  const location = useLocation();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
  
  const [showMicroSelector, setShowMicroSelector] = useState(false);
  const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const selectedFocus = location.state?.selectedFocus;
  const activeTrigger = location.state?.trigger || 'after_homepage';
  
  const fallbackImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80";

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
    navigate('/onboarding/commitment', { state: { sprintId: sprint.id, sprint: sprint, selectedFocus, trigger: activeTrigger } });
  };

  const handleSkipClarity = () => {
      navigate('/onboarding/focus-selector', { 
          state: { 
              trigger: 'skip_clarity',
              fromClaritySprintId: sprintId 
          } 
      });
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

  return (
    <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
      <div className="max-w-screen-lg mx-auto px-4 pt-4">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/onboarding/focus-selector', { state: { trigger: activeTrigger } })} 
            className="group flex items-center text-gray-400 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
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
            
            {/* Hero Section - Moderate Sizing */}
            <div className="relative h-[260px] sm:h-[320px] lg:h-[400px] rounded-[3rem] overflow-hidden shadow-2xl group border-4 border-white bg-dark">
              <img 
                src={imageError || !sprint.coverImageUrl ? fallbackImage : sprint.coverImageUrl} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={sprint.title} 
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <div className="mb-4">
                  <span className="px-3 py-1.5 bg-[#0E7850] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">FOUNDATIONAL PATH</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4 italic">
                  <FormattedText text={sprint.title} inline />
                </h1>
                {sprint.subtitle && (
                  <p className="text-white/70 text-sm md:text-base font-medium italic tracking-tight mb-6 leading-snug max-w-xl">
                    {sprint.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">
                  <Clock className="w-3 h-3" />
                  {sprint.duration} DAY PROTOCOL
                </div>
              </div>
            </div>

            {sprint.dynamicSections ? (
              sprint.dynamicSections.map((section, index) => (
                <section key={index} className="bg-white rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-gray-100 shadow-sm animate-fade-in">
                  <SectionHeading>{section.title}</SectionHeading>
                  <DynamicSectionRenderer section={section} />
                </section>
              ))
            ) : (
              <>
                {/* Optimized Match Card - Exact UI from Reference */}
                {selectedFocus && (
                  <div className="bg-[#E7F5F0] border border-[#D3EBE3] rounded-[2.5rem] px-8 py-6 flex items-center justify-between animate-fade-in shadow-sm">
                      <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#159E6A]">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"/>
                              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2.5"/>
                              <circle cx="12" cy="12" r="2" fill="currentColor"/>
                            </svg>
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-[#159E6A] uppercase tracking-[0.25em] mb-1">Optimized Match</p>
                              <p className="text-[14px] font-bold text-gray-700 italic leading-none">"{selectedFocus}"</p>
                          </div>
                      </div>
                      <span className="text-[9px] font-black bg-white px-4 py-2 rounded-xl text-gray-400 uppercase tracking-widest shadow-sm">Validated</span>
                  </div>
                )}

                {/* Transformation Section - Normalized Text Size, No Italics */}
                <section className="bg-white rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-gray-100 shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="space-y-10">
                      <div className="text-gray-900 font-medium text-sm leading-relaxed max-w-none">
                        <FormattedText text={sprint.transformation || sprint.description} />
                      </div>
                      <div className="h-px bg-gray-50 w-24"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {sprint.forWho && sprint.forWho.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-1 h-3 bg-primary rounded-full"></span>
                              Ideal For You If
                            </h4>
                            <ul className="space-y-4">
                                {sprint.forWho.map((item, i) => (
                                    <li key={i} className="flex gap-4 items-start"><span className="text-primary mt-1 flex-shrink-0"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span><p className="text-sm italic font-semibold text-gray-600 leading-snug">{item}</p></li>
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
                            <ul className="space-y-4 opacity-60">
                                {sprint.notForWho.map((item, i) => (
                                    <li key={i} className="flex gap-4 items-start"><span className="text-red-400 mt-1 flex-shrink-0"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span><p className="text-sm font-semibold text-gray-500 leading-snug">{item}</p></li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* How This Sprint Works - Green Background */}
                {sprint.methodSnapshot && sprint.methodSnapshot.length > 0 && (
                    <section className="bg-primary text-white rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl border border-white/5 group">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48 opacity-60"></div>
                        
                        <div className="relative z-10">
                            <SectionHeading color="white/40">How This Sprint Works</SectionHeading>
                            <div className="mt-6 space-y-10">
                                <p className="text-2xl md:text-4xl font-black text-white italic tracking-tighter leading-[1.1] mb-12">
                                    For {sprint.duration} days, you’ll complete one <span className="text-[#0FB881]">focused action</span> per day.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {sprint.methodSnapshot.map((item, i) => (
                                        <div key={i} className="space-y-3 group/item">
                                            <div className="flex items-center gap-3">
                                              <span className="text-[10px] font-black text-white/20 italic">0{i+1}</span>
                                              <p className="text-white font-black uppercase text-[11px] tracking-[0.25em]">
                                                  {item.verb}
                                              </p>
                                            </div>
                                            <p className="text-white/60 text-[12px] font-medium leading-relaxed italic">
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
                    <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl animate-fade-in relative overflow-hidden">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-10">By Day {sprint.duration}, You'll Have:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 relative z-10">
                            {sprint.outcomes.map((outcome, i) => (
                                <div key={i} className="flex items-start gap-5 group">
                                    <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 text-[9px] shadow-md">✓</div>
                                    <p className="font-black text-gray-800 leading-tight text-xs italic">{outcome}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
              </>
            )}

            {/* Removed Outcome Statement section */}
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] lg:sticky lg:top-8 overflow-hidden relative group/card">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
              
              {/* Decorative Background Element */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover/card:bg-primary/10 transition-colors duration-700"></div>

              <div className="text-center mb-10 relative z-10">
                <SectionHeading>Sprint Status</SectionHeading>
                <div className="flex flex-col items-center">
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-1 italic">Foundational</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Core Protocol</p>
                </div>
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
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Execution Mode</p>
                          <p className="text-sm font-black text-gray-900 leading-none">{sprint.protocol || 'One action per day'}</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-4 relative z-10">
                <Button onClick={handleProceed} className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black group/btn">
                    Authorize Path 
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
                
                <div className="text-center space-y-3 pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 leading-relaxed">Already clear on your direction?</p>
                  <button onClick={handleSkipClarity} className="text-[11px] font-black text-primary hover:underline uppercase tracking-widest transition-all cursor-pointer bg-primary/5 px-6 py-3 rounded-2xl hover:bg-primary/10">Skip to Execution</button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 opacity-40 group-hover/card:opacity-60 transition-opacity">
                    <ShieldCheck className="w-3 h-3 text-gray-400" />
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Secure Protocol</span>
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
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ClaritySprintDescription;
