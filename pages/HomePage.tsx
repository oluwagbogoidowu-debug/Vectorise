import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const PROBLEM_FLOWS = [
  [
    { text: "Big goals.", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
    { text: "Too many options.", color: "bg-indigo-50 text-indigo-800 border-indigo-100" },
    { text: "Too much content.", color: "bg-orange-50 text-orange-800 border-orange-100" },
    { text: "No real traction.", color: "bg-rose-50 text-rose-800 border-rose-100" }
  ],
  [
    { text: "Focus keeps shifting.", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
    { text: "Effort gets scattered.", color: "bg-indigo-50 text-indigo-800 border-indigo-100" },
    { text: "Nothing sticks.", color: "bg-orange-50 text-orange-800 border-orange-100" },
    { text: "Nothing compounds.", color: "bg-rose-50 text-rose-800 border-rose-100" }
  ],
  [
    { text: "You stay active.", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
    { text: "But not advancing.", color: "bg-indigo-50 text-indigo-800 border-indigo-100" },
    { text: "Time keeps moving.", color: "bg-orange-50 text-orange-800 border-orange-100" },
    { text: "You stay in place.", color: "bg-rose-50 text-rose-800 border-rose-100" }
  ]
];
import LocalLogo from '../components/LocalLogo';
import { sprintService } from '../services/sprintService';
import { GlobalOrchestrationSettings, MicroSelector, LifecycleSlotAssignment } from '../types';
import { LIFECYCLE_SLOTS } from '../services/mockData';

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
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFlowIndex((prev) => (prev + 1) % PROBLEM_FLOWS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubSettings = sprintService.subscribeToGlobalSettings((settings) => setGlobalSettings(settings));
    const unsubOrchestration = sprintService.subscribeToOrchestration((mapping) => setOrchestration(mapping));
    
    return () => {
      unsubSettings();
      unsubOrchestration();
    };
  }, []);

  const handleStartAction = () => {
    // Check if there's a specific orchestration for after_homepage
    const afterHomepageAssignment = Object.entries(orchestration).find(
      ([_, a]) => a.stateTrigger === 'after_homepage'
    );

    if (afterHomepageAssignment) {
      const [slotId, assignment] = afterHomepageAssignment;
      // If it's the clarity slot, go to focus selector
      if (slotId === 'slot_found_clarity') {
        navigate('/onboarding/focus-selector', { state: { trigger: 'after_homepage' } });
      } else if (assignment.sprintId) {
        // If it's a direct sprint, go to description
        navigate(`/onboarding/description/${assignment.sprintId}`, { state: { trigger: 'after_homepage' } });
      } else {
        // Fallback
        navigate('/onboarding/focus-selector', { state: { trigger: 'after_homepage' } });
      }
    } else {
      // Default behavior: go to focus selector (which we've made default to clarity slot)
      navigate('/onboarding/focus-selector', { state: { trigger: 'after_homepage' } });
    }
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

  const claritySlotName = useMemo(() => {
    const claritySlotDef = LIFECYCLE_SLOTS.find(s => s.id === 'slot_found_clarity');
    return claritySlotDef ? claritySlotDef.name.toUpperCase() : 'CLARITY';
  }, []);

  return (
    <div className="bg-white w-full font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden flex flex-col">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/welcome" className="hover:scale-105 transition-transform duration-500">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
          </Link>
          <div className="flex gap-6 items-center">
            <Link to="/onboarding/coach/welcome" className="hidden sm:block text-[8px] font-black text-gray-400 hover:text-primary uppercase tracking-[0.1em] transition-colors">
              I'M A COACH
            </Link>
            <button 
              onClick={handleStartAction}
              className="px-6 py-2.5 bg-primary text-white rounded-full text-[8px] font-black uppercase tracking-[0.1em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 cursor-pointer"
            >
              Start
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-[100px] pb-10 md:pt-40 md:pb-28 flex flex-col items-center justify-center px-6 text-center animate-fade-in flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-6xl md:text-[110px] font-black text-gray-900 tracking-tighter leading-[0.85] mb-8">
            Grow into who <br/> <span className="italic">you’re <span className="text-primary">becoming.</span></span>
          </h1>
          
          <div className="max-w-2xl mx-auto mb-10 space-y-5">
            <div className="py-4 md:py-6 text-center">
                <p className="text-base md:text-lg text-black font-bold leading-tight">
                    You don’t lack ambition but a clear structure that compounds into intentional growth.
                </p>
            </div>
            
            <div className="bg-gray-50 rounded-[2rem] p-8 md:p-10 text-center border border-gray-100 shadow-inner mt-8 mb-6">
              <p className="text-[14px] md:text-[16px] text-gray-600 font-medium leading-relaxed">
                <strong className="text-primary font-bold">Vectorise</strong> is a <strong className="text-gray-800 font-bold">guided system</strong> for building real progress through <strong className="text-gray-800 font-bold">focused sprints</strong> — linking <strong className="text-gray-800 font-bold">clarity</strong>, <strong className="text-gray-800 font-bold">skill-building</strong>, and <strong className="text-gray-800 font-bold">real-world application</strong>.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 mb-8">
                <span className="text-[11px] font-black uppercase tracking-widest text-black"><span className="text-primary">It is </span>A clear path of progression.</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center">
              <button 
                  onClick={handleStartAction}
                  className="px-12 py-5 bg-primary text-white font-black uppercase tracking-[0.15em] text-[10px] rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all active:scale-95 cursor-pointer"
              >
                  Start your Rise
              </button>
            </div>
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                ALREADY HAVE AN ACCOUNT? <Link to="/login" className="text-black hover:underline ml-1">CONTINUE YOUR RISE</Link>
            </p>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/2 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      </section>

      {/* THE REAL PROBLEM SECTION */}
      <section className="relative py-16 md:py-24 bg-gray-50 border-y border-gray-100 px-6 text-center flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-[80px] font-black text-gray-900 tracking-tighter leading-none mb-10">
            Here's the <span className="text-primary italic">problem</span>.
          </h2>
          
          <div className="max-w-3xl mx-auto mb-16">
            <p className="text-[12px] text-gray-500 font-medium leading-relaxed mb-12">
              Without a system connecting learning, practice, and application, effort becomes scattered.
            </p>
            
            <div className="relative min-h-[120px] md:min-h-[60px] flex justify-center items-center mb-16 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFlowIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="flex flex-wrap justify-center gap-3 md:gap-4 absolute w-full px-4"
                >
                  {PROBLEM_FLOWS[currentFlowIndex].map((item, i) => (
                    <div key={i} className={`${item.color} px-4 py-2 md:px-6 md:py-3 rounded-full border font-black italic text-[12px] md:text-sm shadow-sm whitespace-nowrap`}>
                      {item.text}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="max-w-2xl mx-auto">
                <p className="text-lg md:text-2xl text-gray-900 font-black leading-[1.2] tracking-tight">
                    "Effort isn’t the issue. Structure is."
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
                 <h2 className="text-4xl md:text-[64px] font-black text-gray-900 tracking-tighter leading-[1]">
                    You stay active.<br />But nothing stacks.
                 </h2>
                 <p className="text-2xl md:text-4xl font-black text-gray-300 tracking-tight leading-[1] italic mt-4">
                    Growth stays uneven.<br />Nothing compounds.
                 </p>
              </div>
              
              <div className="space-y-6 text-[15px] md:text-[17px] text-gray-600 font-medium leading-[1.8] max-w-lg relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-100 via-gray-200 to-primary/20 rounded-full"></div>
                <div className="pl-6 md:pl-10 space-y-6">
                  <p>I didn’t build this as a theory.<br />I built it from trying to grow without a system.</p>
                  <p>I was learning, switching focus, picking up skills, trying to improve — but nothing connected.<br />I wasn’t progressing. I was accumulating random effort.</p>
                  <p className="text-gray-900 font-bold text-base md:text-lg mt-8">
                    Until I started building structured cycles for focus, practice, and reflection.<br />
                    That’s when growth started compounding.<br />
                    <span className="text-primary italic font-black text-xl md:text-2xl block mt-4 tracking-tight">Not faster. Just structured.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center">
               <div className="relative w-full aspect-[4/5] bg-white rounded-[3rem] p-2 md:p-3 shadow-2xl ring-1 ring-gray-900/5">
                 <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-gray-100 relative">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1adBe3Z_E3_9mAPPG86f67dYENzT1jR7O" 
                    className="w-full h-full object-cover animate-grayscale-loop" 
                    alt="Founder Story" 
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[2.5rem]"></div>
                 </div>
               </div>
               <p className="mt-8 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] text-center leading-relaxed">BUILT BY SOMEONE WHO LEARNED <br/> THAT EFFORT WITHOUT STRUCTURE DOESN’T COMPOUND.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE PRINCIPLE SECTION (DARK) */}
      <section className="py-24 md:py-40 bg-dark text-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-[80px] font-black italic tracking-tighter leading-none mb-8">The Principle.</h2>
            <p className="text-white/60 font-medium text-xs md:text-sm max-w-lg mx-auto leading-relaxed uppercase tracking-[0.1em]">
                Vectorise is built on a simple idea. Growth compounds when it’s structured. Not a collection of courses.<br/>
                <span className="text-white font-black">A progression system.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "PROTOCOL", title: "Sprints", desc: "One outcome." },
              { label: "STRATEGY", title: "One Focus", desc: "No split attention." },
              { label: "EXECUTION", title: "Daily Action", desc: "Execution, not theory." },
              { label: "SUPPORT", title: "Guidance", desc: "Clarity when stuck." }
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 p-8 rounded-[1.5rem] group hover:bg-white/[0.05] transition-all">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">{item.label}</p>
                <h4 className="text-xl font-black mb-2 italic">{item.title}</h4>
                <p className="text-[12px] md:text-sm text-white/40 font-medium italic">"{item.desc}"</p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <p className="text-lg md:text-2xl font-black italic tracking-tight opacity-80 leading-snug">
                Finish a sprint. Build the next capability. <br className="hidden md:block" /> That’s how development stacks.
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
            </div>
            
            <div className="lg:col-span-7 space-y-3">
                {[
                    "You enter a guided growth cycle.",
                    "You focus on one capability for a short period.",
                    "You learn by doing, not consuming.",
                    "You apply in real situations immediately.",
                    "You reflect on what changed in your thinking and behavior."
                ].map((text, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-100 p-5 md:p-6 rounded-[1.5rem] flex items-center gap-6">
                        <span className="text-lg md:text-xl font-black text-gray-200 italic">0{i+1}</span>
                        <p className="text-sm md:text-base font-black text-gray-900 tracking-tight leading-snug">{text}</p>
                    </div>
                ))}
                
                <div className="pt-8 md:pt-12">
                    <p className="text-xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight italic">
                        You don’t just understand more.<br/>
                        <span className="text-primary">You become more capable.</span>
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* WHO THIS IS FOR SECTION */}
      <section className="py-24 md:py-40 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-[64px] font-black text-gray-900 tracking-tighter leading-none mb-6">Who this is for</h2>
            <p className="text-gray-400 font-medium italic text-xs md:text-sm mb-16 uppercase tracking-widest">Vectorise is for people in transition and growth phases.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {[
                    { t: "Students", s: "PREPARING", d: "Preparing for real-world expectations." },
                    { t: "Early professionals", s: "BUILDING", d: "Building competence and direction." },
                    { t: "Builders/Creators", s: "DEVELOPING", d: "Developing themselves to match their ambitions." }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col text-left h-full">
                        <h4 className="text-lg font-black text-gray-900 italic mb-1">{item.t}</h4>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6">{item.s}</p>
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic mt-auto">"{item.d}"</p>
                    </div>
                ))}
            </div>

            <p className="text-lg md:text-2xl font-black italic tracking-tight text-gray-900 leading-tight">
                "If you feel like you’re learning a lot but not becoming more effective, <span className="text-primary underline decoration-primary/20 underline-offset-8">this is for you.</span>"
            </p>
        </div>
      </section>

      {/* FINAL CTA SECTION - RECTANGULAR FULL WIDTH */}
      <section className="bg-primary py-24 md:py-40 px-6 relative overflow-hidden flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-[80px] font-black text-white italic tracking-tighter leading-[1] mb-10">
                You don’t need <br className="hidden md:block" /> more information.
            </h2>
            <p className="text-white/60 text-[12px] md:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto mb-12 leading-relaxed">
                You need structured growth.
            </p>
            <button 
                onClick={handleStartAction}
                className="px-12 py-5 bg-white text-primary font-black uppercase tracking-[0.3em] text-[10px] rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
                Start your sprint now
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
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em] leading-none pt-0.5">VISIBLE PROGRESS SYSTEM</p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2026 VECTORISE</p>
                <Link to="/onboarding/coach/welcome" className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">I'M A COACH</Link>
                <Link to="/partner" className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">BE A PARTNER</Link>
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
                  <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">{opt.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMicroSelector(false)} className="w-full mt-8 py-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors cursor-pointer">Close</button>
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