import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';
import { sprintService } from '../services/sprintService';
import { GlobalOrchestrationSettings, MicroSelector, LifecycleSlotAssignment } from '../types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
  const [orchestration, setOrchestration] = useState<Record<string, LifecycleSlotAssignment>>({});
  
  const [showMicroSelector, setShowMicroSelector] = useState(false);
  const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [pendingTargetSprintId, setPendingTargetSprintId] = useState<string | null>(null);

  useEffect(() => {
    const unsubSettings = sprintService.subscribeToGlobalSettings((settings) => setGlobalSettings(settings));
    const unsubOrchestration = sprintService.subscribeToOrchestration((mapping) => setOrchestration(mapping));
    
    return () => {
      unsubSettings();
      unsubOrchestration();
    };
  }, []);

  const handleStartAction = () => {
    const triggerMatch = (Object.values(orchestration) as LifecycleSlotAssignment[]).find(a => a.stateTrigger === 'after_homepage');
    const targetId = triggerMatch ? (triggerMatch.sprintId || (triggerMatch.sprintIds && triggerMatch.sprintIds[0])) : null;
    const triggerAction = globalSettings?.triggerActions?.['after_homepage'];
    let selectorToShow = null;
    
    if (triggerAction?.type === 'show_micro_selector') {
      selectorToShow = globalSettings?.microSelectors.find(ms => ms.id === triggerAction.value);
    }
    
    if (!selectorToShow) {
      selectorToShow = globalSettings?.microSelectors.find(ms => ms.stage === 'Foundation');
    }

    if (selectorToShow) {
      setActiveSelector(selectorToShow);
      setCurrentStepIdx(0);
      setPendingTargetSprintId(targetId || null);
      setShowMicroSelector(true);
      return;
    }

    if (targetId) {
       navigate(`/onboarding/clarity-description/${targetId}`);
       return;
    }
    
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
    if (pendingTargetSprintId) {
      navigate(`/onboarding/clarity-description/${pendingTargetSprintId}`);
    } else {
      navigate('/discover');
    }
  };

  const currentStep = activeSelector?.steps[currentStepIdx];

  return (
    <div className="bg-white w-full font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden flex flex-col">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="hover:scale-105 transition-transform duration-500">
            <LocalLogo type="green" className="h-[1.125rem] md:h-5 w-auto" />
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
                  {/* Applied animate-grayscale-loop to switch filters periodically */}
                  <img 
                    src="https://lh3.googleusercontent.com/d/1adBe3Z_E3_9mAPPG86f67dYENzT1jR7O" 
                    className="w-full h-full object-cover animate-grayscale-loop" 
                    alt="Founder Story" 
                  />
               </div>
               <p className="mt-6 text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] text-center leading-relaxed">BUILT BY SOMEONE WHO'S WALKED THE PATH FROM <br/> CONFUSION TO CLARITY.</p>
            </div>
          </div>

          <div className="mt-20 max-w-4xl mx-auto bg-gray-50 rounded-[2rem] p-10 md:p-14 text-center border border-gray-100 shadow-inner">
             <p className="text-lg md:text-2xl text-gray-900 font-black italic">
                "Vectorise exists so others don’t have to <br className="hidden md:block" />
                <span className="text-primary underline decoration-primary/20 underline-offset-8">learn this late.</span>"
             </p>
          </div>
        </div>
      </section>

      {/* THE SYSTEM SECTION (DARK) */}
      <section className="py-24 md:py-40 bg-dark text-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-[80px] font-black italic tracking-tighter leading-none mb-8">The System.</h2>
            <p className="text-white/40 font-bold text-xs md:text-base max-w-md mx-auto leading-relaxed uppercase tracking-[0.1em]">
                Vectorise is not a marketplace of programs. <br/>
                It's a guided growth system designed to force focus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "PROTOCOL", title: "Sprints", desc: "Short, outcome-driven growth cycles." },
              { label: "STRATEGY", title: "One Focus", desc: "Every sprint solves one clear problem." },
              { label: "EXECUTION", title: "Daily Action", desc: "You act, not just consume content." },
              { label: "SUPPORT", title: "Coach Guidance", desc: "Access when friction shows up." }
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 p-8 rounded-[1.5rem] group hover:bg-white/[0.05] transition-all">
                <p className="text-[7px] font-black text-primary uppercase tracking-[0.4em] mb-4">{item.label}</p>
                <h4 className="text-xl font-black mb-2 italic">{item.title}</h4>
                <p className="text-xs text-white/40 font-medium italic">"{item.desc}"</p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <p className="text-lg md:text-2xl font-black italic tracking-tight opacity-80 leading-snug">
                "Finish one sprint. Then decide your next move. That’s <br className="hidden md:block" /> how real growth compounds."
            </p>
          </div>
        </div>
      </section>

      {/* WHEN YOU CLICK START SECTION */}
      <section className="py-24 md:py-40 bg-white px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5">
                <h2 className="text-4xl md:text-[64px] font-black text-gray-900 tracking-tighter leading-[1] mb-8">
                    When you click <br/><span className="text-primary italic">Start.</span>
                </h2>
                <p className="text-gray-400 font-bold text-xs md:text-sm leading-relaxed max-w-xs italic uppercase tracking-widest">
                    No theory overload. No pressure to have life figured out. Just clarity you can build on.
                </p>
            </div>
            
            <div className="lg:col-span-7 space-y-3">
                {[
                    "You enter a structured 5-day experience",
                    "Each day gives you one prompt and one action",
                    "You learn by doing, not overthinking",
                    "You reflect on real signals, not guesses",
                    "You leave with direction and momentum"
                ].map((text, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-100 p-5 md:p-6 rounded-[1.5rem] flex items-center gap-6">
                        <span className="text-lg md:text-xl font-black text-gray-200 italic">0{i+1}</span>
                        <p className="text-xs md:text-sm font-black text-gray-900 tracking-tight leading-none">{text}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* WHO THIS IS FOR SECTION */}
      <section className="py-24 md:py-40 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-[64px] font-black text-gray-900 tracking-tighter leading-none mb-6">Who this is for</h2>
            <p className="text-gray-400 font-medium italic text-xs md:text-sm mb-16 uppercase tracking-widest">Vectorise is for people at a transition point.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {[
                    { t: "Students", s: "FINAL YEAR", d: "Unsure of what comes next after graduation." },
                    { t: "Professionals", s: "EARLY CAREER", d: "Questioning direction and seeking alignment." },
                    { t: "Creators", s: "BUILDERS", d: "Recalibrating focus to scale what actually works." }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col text-left h-full">
                        <h4 className="text-lg font-black text-gray-900 italic mb-1">{item.t}</h4>
                        <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-6">{item.s}</p>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic mt-auto">"{item.d}"</p>
                    </div>
                ))}
            </div>

            <p className="text-lg md:text-2xl font-black italic tracking-tight text-gray-900 leading-tight">
                "If you’re tired of moving without certainty, <span className="text-primary underline decoration-primary/20 underline-offset-8">you belong here.</span>"
            </p>
        </div>
      </section>

      {/* THE PROMISE SECTION */}
      <section className="py-24 md:py-40 bg-white px-6">
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-[80px] font-black text-gray-900 tracking-tighter leading-none mb-10 italic">The Promise.</h2>
            <div className="space-y-2 mb-20">
                <p className="text-xs md:text-base text-gray-400 font-medium italic">You don’t leave Vectorise with motivation.</p>
                <p className="text-sm md:text-xl font-black text-gray-900 uppercase tracking-[0.3em] leading-none">You leave with:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
                {[
                    { t: "Clarity", s: "ON WHAT MATTERS NOW" },
                    { t: "Momentum", s: "FROM REAL ACTION" },
                    { t: "Proof", s: "YOU CAN BUILD ON" }
                ].map((item, i) => (
                    <div key={i} className="space-y-2">
                        <h4 className="text-3xl md:text-4xl font-black text-primary italic leading-none">{item.t}</h4>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">{item.s}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* FINAL CTA SECTION - RECTANGULAR FULL WIDTH */}
      <section className="bg-primary py-24 md:py-40 px-6 relative overflow-hidden flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-[80px] font-black text-white italic tracking-tighter leading-[1] mb-10">
                Clarity on your <br className="hidden md:block" /> next move.
            </h2>
            <p className="text-white/60 text-xs md:text-lg font-medium italic max-w-sm mx-auto mb-12 leading-relaxed">
                You don't need to figure out your whole future. <br className="hidden md:block" /> You just need to act today.
            </p>
            <button 
                onClick={handleStartAction}
                className="px-12 py-5 bg-white text-primary font-black uppercase tracking-[0.3em] text-[10px] md:text-xs rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
                START YOUR CLARITY SPRINT
            </button>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none"></div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-white border-t border-gray-100 px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-6">
                <LocalLogo type="green" className="h-4 w-auto" />
                <div className="h-5 w-px bg-gray-200"></div>
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] leading-none pt-0.5">VISIBLE PROGRESS SYSTEM</p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2026 VECTORISE</p>
                <Link to="/onboarding/coach/welcome" className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">I'M A COACH</Link>
                <Link to="/partner" className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">BE A PARTNER</Link>
            </div>
        </div>
      </footer>

      {/* Engagement Micro Selector Modal */}
      {showMicroSelector && activeSelector && currentStep && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm shadow-2xl relative animate-slide-up">
            <header className="text-center mb-10">
              <LocalLogo type="favicon" className="h-10 w-auto mx-auto mb-6 opacity-40" />
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight italic leading-tight px-2">{currentStep.question}</h2>
            </header>
            <div className="space-y-3">
              {currentStep.options.map((opt, idx) => (
                <button key={idx} onClick={() => handleOptionClick(opt)} className="w-full group relative overflow-hidden bg-gray-50 border border-gray-100 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center cursor-pointer">
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">{opt.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMicroSelector(false)} className="w-full mt-8 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors cursor-pointer">Close</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Loop grayscale filters: 0% and 100% are grayscale, middle is color */
        @keyframes grayscaleLoop {
          0%, 100% { filter: grayscale(100%) brightness(1.1) contrast(1.1); }
          40%, 60% { filter: grayscale(0%) brightness(1) contrast(1); }
        }
        .animate-grayscale-loop { animation: grayscaleLoop 12s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default HomePage;