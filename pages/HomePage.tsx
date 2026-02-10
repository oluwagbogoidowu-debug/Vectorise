
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';
import { sprintService } from '../services/sprintService';
import { GlobalOrchestrationSettings, MicroSelector, LifecycleSlotAssignment } from '../types';

/**
 * HomePage component: The main landing page for the Vectorise platform.
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
  const [orchestration, setOrchestration] = useState<Record<string, LifecycleSlotAssignment>>({});
  
  const [showMicroSelector, setShowMicroSelector] = useState(false);
  const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    const unsubSettings = sprintService.subscribeToGlobalSettings((settings) => setGlobalSettings(settings));
    const unsubOrchestration = sprintService.subscribeToOrchestration((mapping) => setOrchestration(mapping));
    
    return () => {
      unsubSettings();
      unsubOrchestration();
    };
  }, []);

  const handleStartAction = () => {
    // Direct navigation to FocusSelector as requested
    navigate('/onboarding/focus-selector');
  };

  const handleOptionClick = (option: any) => {
    if (option.action === 'next_step') {
      const nextIdx = currentStepIdx + 1;
      if (activeSelector && nextIdx < activeSelector.steps.length) {
        setCurrentStepIdx(nextIdx);
      } else {
        finalizeEngagement();
      }
    } else if (option.action === 'skip_to_stage') {
      navigate('/discover', { state: { targetStage: option.value } });
    } else if (option.action === 'finish_and_recommend' || option.action === 'trigger_action') {
      finalizeEngagement();
    }
  };

  const finalizeEngagement = () => {
    setShowMicroSelector(false);
    navigate('/discover');
  };

  const currentStep = activeSelector?.steps[currentStepIdx];

  return (
    <div className="bg-white w-full font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden flex flex-col">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="hover:scale-105 transition-transform duration-500">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
          </Link>
          <div className="flex gap-6 items-center">
            <Link to="/onboarding/coach/welcome" className="hidden sm:block text-[9px] font-black text-gray-400 hover:text-primary uppercase tracking-[0.1em] transition-colors">
              I'M A COACH
            </Link>
            <button 
              onClick={handleStartAction}
              className="px-6 py-2.5 bg-primary text-white rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 cursor-pointer"
            >
              START SPRINT
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 text-center animate-fade-in flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-6xl md:text-[110px] font-black text-gray-900 tracking-tighter leading-[0.85] mb-12">
            Grow into who <br/> <span className="italic">you’re <span className="text-primary">becoming.</span></span>
          </h1>
          
          <div className="max-w-2xl mx-auto mb-16 space-y-6">
            <div className="space-y-1">
                <p className="text-lg md:text-2xl text-gray-900 font-bold leading-tight">
                    You don’t lack ambition.
                </p>
                <p className="text-lg md:text-2xl text-gray-400 font-medium italic">
                    You lack clarity on what move actually matters now.
                </p>
            </div>
            <p className="text-xs md:text-base text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
              Vectorise helps you gain clarity at critical transition points and turn it into focused action through short, guided sprints.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button 
                onClick={handleStartAction}
                className="px-12 py-5 bg-primary text-white font-black uppercase tracking-[0.15em] text-[10px] md:text-xs rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all active:scale-95 cursor-pointer"
            >
                START YOUR CLARITY SPRINT
            </button>
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                ALREADY HAVE AN ACCOUNT? <Link to="/login" className="text-primary hover:underline ml-1">CONTINUE YOUR RISE</Link>
            </p>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/2 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      </section>

      {/* THE REAL PROBLEM SECTION */}
      <section className="relative py-24 md:py-40 bg-white px-6 text-center flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-[80px] font-black text-gray-900 tracking-tighter leading-none mb-10">
            The <span className="text-primary italic">Real</span> Problem.
          </h2>
          
          <div className="max-w-3xl mx-auto mb-16">
            <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed mb-12">
              Most people don’t fail because they’re lazy. They fail because effort is scattered.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-16">
              {[
                { text: "Big goals.", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
                { text: "Too many options.", color: "bg-indigo-50 text-indigo-800 border-indigo-100" },
                { text: "Endless content.", color: "bg-orange-50 text-orange-800 border-orange-100" },
                { text: "No real traction.", color: "bg-rose-50 text-rose-800 border-rose-100" }
              ].map((item, i) => (
                <div key={i} className={`${item.color} px-4 py-2 md:px-6 md:py-3 rounded-full border font-black italic text-[10px] md:text-xs shadow-sm`}>
                  {item.text}
                </div>
              ))}
            </div>

            <div className="max-w-2xl mx-auto">
                <p className="text-lg md:text-2xl text-gray-900 font-black leading-[1.2] tracking-tight italic">
                    "You want to move forward, but you’re unsure which <br className="hidden md:block" /> direction is worth committing to. <br/>
                    <span className="text-primary">That uncertainty quietly wastes years.</span>"
                </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE INSIGHT SECTION - ANIMATED FILTERS */}
      <section className="py-24 md:py-40 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-7 space-y-12">
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">THE INSIGHT</p>
                 <h2 className="text-4xl md:text-[64px] font-black text-gray-900 tracking-tighter leading-[1] italic">
                    Clarity doesn’t come from <br/> more planning.
                 </h2>
                 <p className="text-2xl md:text-4xl font-black text-gray-300 tracking-tight leading-none italic">
                    It comes from intentional action.
                 </p>
              </div>
              
              <div className="space-y-6 text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-lg">
                <p>I learned this the hard way.</p>
                <p>I had vision. I had ambition. But no clear starting point. I kept moving, yet nothing compounded.</p>
                <p className="text-gray-900 font-black">
                  Once clarity entered the picture, everything changed. My actions became intentional. My progress stopped being random.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center">
               <div className="relative w-full aspect-[4/5] bg-yellow-400 rounded-[3rem] overflow-hidden shadow-2xl">
                  {/* Added image content and closed tags for the insight section */}
                  <img 
                    src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80" 
                    className="w-full h-full object-cover" 
                    alt="Clarity Insight" 
                  />
                  <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-gray-50 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <LocalLogo type="green" className="h-8 w-auto" />
          <div className="flex gap-8">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">© 2026 Vectorise</p>
            <Link to="/onboarding/coach/welcome" className="text-[9px] font-black text-gray-400 hover:text-primary uppercase tracking-widest transition-colors">Coach Portal</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

// Fixed: Added missing default export to satisfy App.tsx import
export default HomePage;
