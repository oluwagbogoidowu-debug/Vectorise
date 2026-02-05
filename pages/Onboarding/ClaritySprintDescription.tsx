
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';

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
  const [showExecutionSelector, setShowExecutionSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState(0); // 0: Confidence, 1: Career/Skill Challenge, 2: Business Forward, 3: Exploring Recommendation
  const [firstChoice, setFirstChoice] = useState<string | null>(null);

  const handleProceed = () => {
    navigate('/onboarding/intro');
  };

  const handleFirstStepChoice = (choice: string) => {
    if (choice === "A specific career path or role" || choice === "A defined skill or craft I’m building") {
        setFirstChoice(choice);
        setSelectorStep(1);
    } else if (choice === "A business or project I’m actively executing") {
        setFirstChoice(choice);
        setSelectorStep(2);
    } else if (choice === "I’m confident, but still exploring") {
        setFirstChoice(choice);
        setSelectorStep(3);
    }
  };

  const handleSecondStepChoice = (challenge: string) => {
    let sprintType = 'Execution Sprint';
    if (challenge === 'Positioning myself better') sprintType = 'Visibility / Positioning Sprint';
    if (challenge === 'Turning effort into results') sprintType = 'Skill Sprint';

    navigate('/onboarding/intro', { 
        state: { 
            skipToExecution: true, 
            executionPath: firstChoice,
            challenge: challenge,
            sprintType: sprintType
        } 
    });
  };

  const handleThirdStepChoice = (moveForward: string) => {
    navigate('/onboarding/intro', { 
        state: { 
            skipToExecution: true, 
            executionPath: firstChoice,
            challenge: moveForward,
            sprintType: moveForward // Directly routing to Focus/Consistency/Momentum Sprint
        } 
    });
  };

  const closeSelector = () => {
    setShowExecutionSelector(false);
    setSelectorStep(0);
    setFirstChoice(null);
  };

  const forYouList = [
    "You feel capable but directionless",
    "You’re overwhelmed by too many options",
    "You’re afraid of choosing wrong, so you delay choosing anything",
    "You want clarity before committing years to a path"
  ];

  const notForYouList = [
    "You want answers without doing the work",
    "You’re looking for motivation, not direction",
    "You won’t commit to daily action"
  ];

  const outcomes = [
    "Clear evidence of what naturally pulls your attention and energy",
    "Confidence to make decisions without waiting for perfect certainty",
    "A simple decision filter for future opportunities",
    "Momentum instead of analysis paralysis"
  ];

  const executionOptions = [
    "A specific career path or role",
    "A defined skill or craft I’m building",
    "A business or project I’m actively executing",
    "I’m confident, but still exploring"
  ];

  const challengeOptions = [
    "Staying consistent",
    "Executing faster",
    "Positioning myself better",
    "Turning effort into results"
  ];

  const forwardMotionOptions = [
    "Focus Sprint",
    "Consistency Sprint",
    "Momentum Sprint"
  ];

  const getModalTitle = () => {
    if (selectorStep === 0) return "What are you currently moving toward with confidence?";
    if (selectorStep === 1) return "What’s your biggest challenge right now?";
    if (selectorStep === 2) return "Choose what will move this forward fastest";
    if (selectorStep === 3) return "Our Recommendation";
    return "";
  };

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
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Hero Image Section */}
            <div className="relative h-[200px] sm:h-[280px] lg:h-[360px] rounded-2xl overflow-hidden shadow-lg group">
              <img 
                src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt="Clarity Sprint" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-primary rounded text-[7px] font-black uppercase tracking-widest border border-white/10 shadow-lg">Foundational Path</span>
                  <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[7px] font-black uppercase tracking-widest border border-white/10">Action-Based</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1 italic">
                  From Confused <br/>to Clear.
                </h1>
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-[0.3em]">5-Day Clarity Protocol</p>
              </div>
            </div>

            {/* Intro Section */}
            <section className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm animate-fade-in">
              <SectionHeading>The Transformation</SectionHeading>
              <div className="space-y-6 text-gray-600 leading-relaxed text-[12px] font-medium">
                <p className="text-gray-900 font-bold text-lg leading-tight italic">
                  You know you want to do something meaningful. You just can’t clearly name what that is yet.
                </p>
                <p>
                  You’ve watched the videos. Saved the posts. Considered tech, entrepreneurship, creative paths. Still stuck.
                </p>
                <p className="text-gray-900 font-black">
                  This sprint is designed to help you move from confusion to direction through action, not overthinking.
                </p>
                
                <div className="h-px bg-gray-50 my-6"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">This sprint is for you if:</h4>
                    <ul className="space-y-2">
                        {forYouList.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className="text-primary mt-0.5 text-[10px]">●</span>
                                <p className="text-[11px] italic font-medium leading-snug">{item}</p>
                            </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">This sprint is not for you if:</h4>
                    <ul className="space-y-2">
                        {notForYouList.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start opacity-60">
                                <span className="text-red-400 mt-0.5 text-[10px]">✕</span>
                                <p className="text-[11px] font-medium leading-snug">{item}</p>
                            </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* How it works Section */}
            <section className="bg-dark text-white rounded-2xl p-8 relative overflow-hidden group shadow-xl">
               <SectionHeading color="primary">How This Sprint Works</SectionHeading>
               <div className="relative z-10 space-y-6">
                 <p className="text-sm text-white/70 font-medium leading-relaxed italic">
                   This is not a course. No long videos. No personality tests. No theory dumps.
                 </p>
                 <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-lg font-black text-white italic tracking-tight mb-4">
                      For 5 days, you’ll complete one focused action per day.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { t: "Energizes", d: "Discover what naturally pulls your attention." },
                        { t: "Drains", d: "Identify the work that depletes your momentum." },
                        { t: "Explores", d: "Find paths actually worth your future time." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-primary font-black uppercase text-[9px] tracking-widest">{item.t}</p>
                          <p className="text-[10px] text-white/40 leading-tight">{item.d}</p>
                        </div>
                      ))}
                    </div>
                 </div>
                 <p className="text-center text-primary font-black uppercase tracking-[0.2em] text-[10px] pt-4 border-t border-white/5">
                   Clarity emerges from what you do, not what you think.
                 </p>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            </section>

            {/* Outcomes Section - Unified Container with Shadow */}
            <section className="bg-white rounded-2xl p-6 md:p-10 border border-gray-100 shadow-xl animate-fade-in">
              <SectionHeading>By Day 5, You'll Have:</SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 mt-6">
                {outcomes.map((outcome, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                      ✓
                    </div>
                    <p className="font-bold text-gray-700 leading-snug text-[12px]">{outcome}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Closing Transformation Section */}
            <section className="py-12 text-center border-t border-gray-100">
                <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-6">The Outcome</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-6 px-4">
                    You won’t have your life figured out. <br/>
                    You’ll have <span className="text-primary underline underline-offset-8 decoration-primary/20">something better: direction you can act on immediately.</span>
                </h3>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-md lg:sticky lg:top-6">
              <div className="text-center mb-6">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <h3 className="text-2xl font-black text-dark tracking-tighter italic leading-none">
                  Foundational
                </h3>
              </div>

              <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">📅</span>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Duration</p>
                          <p className="text-[10px] font-bold text-gray-900">5 Continuous Days</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg">⚡</span>
                      <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Protocol</p>
                          <p className="text-[10px] font-bold text-gray-900">One action per day</p>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleProceed} 
                  className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[9px] uppercase tracking-widest font-black"
                >
                  Start My Clarity Sprint
                </Button>
                
                <div className="text-center px-2">
                  <p className="text-[9px] text-gray-400 font-bold leading-relaxed italic">
                    Already clear on your direction? <br/>
                    <button 
                      onClick={() => {
                        setSelectorStep(0);
                        setShowExecutionSelector(true);
                      }} 
                      className="text-primary hover:underline cursor-pointer font-black"
                    >
                      You’ll be able to skip this sprint and choose a focused execution sprint next.
                    </button>
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 shadow-inner border border-gray-100/50">
                    <LocalLogo type="green" className="h-5 w-auto opacity-50" />
                </div>
                <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-1">System Sprint</p>
                <h4 className="text-[12px] font-black text-dark tracking-tight leading-none mb-1">Vectorise Protocol</h4>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">Level 01 Core</p>
              </div>
            </div>

            {/* High-level reminder */}
            <div className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden group shadow-lg">
                <div className="relative z-10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-3">Commitment</p>
                    <p className="text-[11px] font-medium italic leading-relaxed opacity-90">
                        No overthinking required. 5 days of showing up for yourself.
                    </p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/20 rounded-full blur-2xl"></div>
            </div>
          </aside>
        </div>
      </div>

      {/* Micro Selector Modal */}
      {showExecutionSelector && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm shadow-2xl relative animate-slide-up">
            <header className="text-center mb-10">
              <LocalLogo type="green" className="h-6 w-auto mx-auto mb-6 opacity-40" />
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight italic leading-tight px-2">
                {getModalTitle()}
              </h2>
            </header>
            
            <div className="space-y-3">
              {selectorStep === 0 && (
                executionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleFirstStepChoice(opt)}
                    className="w-full group relative overflow-hidden bg-gray-50 border border-gray-100 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center"
                  >
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">
                      {opt}
                    </span>
                  </button>
                ))
              )}

              {selectorStep === 1 && (
                challengeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSecondStepChoice(opt)}
                    className="w-full group relative overflow-hidden bg-gray-50 border border-gray-100 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center"
                  >
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">
                      {opt}
                    </span>
                  </button>
                ))
              )}

              {selectorStep === 2 && (
                forwardMotionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleThirdStepChoice(opt)}
                    className="w-full group relative overflow-hidden bg-gray-50 border border-gray-100 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center"
                  >
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors leading-relaxed block">
                      {opt}
                    </span>
                  </button>
                ))
              )}

              {selectorStep === 3 && (
                <div className="space-y-8 text-center animate-fade-in">
                  <div className="space-y-4">
                    <p className="text-gray-900 font-bold text-lg leading-tight italic">
                      You don’t need more information. <br/>
                      <span className="text-primary not-italic font-black">You need feedback from action.</span>
                    </p>
                    <p className="text-gray-500 font-medium text-xs leading-relaxed italic">
                      We recommend starting with the 5-Day Clarity Sprint.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={closeSelector} 
                    className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[9px] uppercase tracking-widest font-black"
                  >
                    Start the Clarity Sprint
                  </Button>
                </div>
              )}
            </div>

            {selectorStep !== 3 && (
              <button 
                onClick={closeSelector}
                className="w-full mt-8 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors"
              >
                Cancel & View Path
              </button>
            )}

            {selectorStep === 3 && (
               <button 
                onClick={() => setSelectorStep(0)}
                className="w-full mt-6 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
               >
                 &larr; Back to choices
               </button>
            )}
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
