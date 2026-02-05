
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

// Fix: Define SectionTitle as a standalone component with explicit children typing to resolve TypeScript errors
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
      {children}
  </h2>
);

const ClaritySprintDescription: React.FC = () => {
  const navigate = useNavigate();

  const handleProceed = () => {
    navigate('/onboarding/intro');
  };

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-primary/10 selection:text-primary">
      {/* Top Banner */}
      <header className="px-6 py-8 border-b border-gray-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
            <LocalLogo type="green" className="h-6 w-auto opacity-80" />
            <button 
                onClick={() => navigate('/onboarding/focus-selector')}
                className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
            >
                Back
            </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 pb-40">
        <div className="mb-20 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none mb-6 italic">
                From Confused <br/>to Clear.
            </h1>
            <p className="text-xl md:text-2xl font-bold text-gray-400 italic leading-tight">
                A 5-Day Clarity Sprint for Students & NYSC Members
            </p>
        </div>

        <div className="space-y-24">
            {/* Target Audience */}
            <section className="animate-slide-up">
                <SectionTitle>Target Audience</SectionTitle>
                <div className="space-y-6">
                    <p className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed">
                        For 300-400 level university students and NYSC corps members who feel stuck between knowing they want to do something meaningful and actually knowing what that is.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            "Consume endless content but still feel directionless",
                            "Have potential but struggle to turn it into clear action",
                            "Feel overwhelmed by options and paralyzed by the fear of choosing wrong",
                            "Want to build a future in tech, entrepreneurship, or creative fields but don't know where to start"
                        ].map((point, i) => (
                            <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-medium text-gray-600 leading-relaxed italic">
                                "{point}"
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NOT For */}
            <section className="animate-slide-up">
                <SectionTitle>This Sprint Is NOT For</SectionTitle>
                <ul className="space-y-4">
                    {[
                        "People looking for a magic formula without doing the work",
                        "Those seeking career advice without self-reflection",
                        "Anyone expecting answers to be handed to them",
                        "People who won't commit to daily action"
                    ].map((point, i) => (
                        <li key={i} className="flex items-start gap-4 text-gray-400 font-bold text-lg leading-tight">
                            <span className="text-red-400 mt-1">✕</span>
                            {point}
                        </li>
                    ))}
                </ul>
            </section>

            {/* Why it works differently */}
            <section className="animate-slide-up">
                <SectionTitle>Why This Sprint Works Differently</SectionTitle>
                <p className="text-lg text-gray-600 font-medium leading-relaxed mb-10">
                    Most clarity programs give you assessments, frameworks, and theories. This sprint does the opposite: it builds clarity through <span className="text-gray-900 font-black">micro-actions</span> that create immediate feedback.
                </p>
                
                <div className="space-y-10">
                    <div className="bg-gray-900 text-white rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden">
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-10">The Science Behind It</h3>
                        <div className="grid grid-cols-1 gap-12">
                            {[
                                { t: "Action creates clarity faster than analysis", d: "Research shows that taking small steps reveals preferences better than planning" },
                                { t: "Energy signals are more reliable than logic", d: "Your emotional response to activities predicts long-term satisfaction better than rational analysis" },
                                { t: "Daily momentum compounds", d: "5 days of aligned action creates more confidence than months of research" }
                            ].map((item, i) => (
                                <div key={i}>
                                    <h4 className="text-xl font-black mb-3 italic tracking-tight">{item.t}</h4>
                                    <p className="text-white/50 text-sm font-medium leading-relaxed">{item.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {[
                            { t: "Zero theory overload", d: "Every day has ONE clear action, not 10 things to think about" },
                            { t: "Real-time feedback loops", d: "You learn about yourself by doing, not by reading personality tests" },
                            { t: "Designed for the overwhelmed", d: "Perfect for Gen Z who are drowning in information but starving for direction" },
                            { t: "Built for tech-age careers", d: "Recognizes that traditional career paths don't work for today's opportunities" }
                        ].map((item, i) => (
                            <div key={i} className="p-8 border border-gray-100 rounded-3xl group hover:border-primary/20 transition-all">
                                <h4 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">{item.t}</h4>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">"{item.d}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Problem */}
            <section className="animate-slide-up">
                <SectionTitle>The Problem You're Facing</SectionTitle>
                <div className="space-y-4">
                    {[
                        "You're constantly asking 'What should I do with my life?' but never finding a clear answer",
                        "You see others with direction while you're still figuring things out",
                        "You start things but drop them because nothing feels 'right'",
                        "You're afraid of choosing the wrong path, so you choose nothing at all",
                        "You consume advice, attend webinars, and read books but still feel confused"
                    ].map((point, i) => (
                        <p key={i} className="text-xl font-bold text-gray-400 group flex gap-4 leading-tight border-b border-gray-50 pb-4 last:border-0">
                            <span className="text-gray-200">0{i+1}</span>
                            <span className="hover:text-gray-900 transition-colors">{point}</span>
                        </p>
                    ))}
                </div>
            </section>

            {/* Outcomes */}
            <section className="animate-slide-up">
                <SectionTitle>What You'll Gain By Day 5</SectionTitle>
                <p className="text-lg text-gray-600 font-medium leading-relaxed mb-12 italic">
                    By the end of this sprint, you won't have your entire life figured out but you'll have something better: <span className="text-gray-900 font-black not-italic">a proven system for creating clarity whenever you feel lost.</span>
                </p>
                <div className="grid grid-cols-1 gap-4">
                    {[
                        { t: "Evidence-Backed Energy", d: "Clarity on what naturally energizes you (not what you think should) - backed by real evidence from your own life" },
                        { t: "Independent Confidence", d: "Confidence to make decisions without waiting for perfect certainty or external validation" },
                        { t: "Personal Decision Filter", d: "A personal decision filter to instantly say yes or no to opportunities (saves hours of overthinking)" },
                        { t: "Experience-Driven Path", d: "Direction based on your actual experiences, not trending career advice or someone else's path" },
                        { t: "Execution Velocity", d: "Action momentum that replaces analysis paralysis with purposeful doing" }
                    ].map((point, i) => (
                        <div key={i} className="flex gap-6 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:border-primary/20 transition-all shadow-sm">
                            <span className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black flex-shrink-0">✓</span>
                            <div>
                                <h4 className="font-black text-gray-900 text-lg mb-1 tracking-tight">{point.t}</h4>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">{point.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Transformation */}
            <section className="py-20 border-t border-gray-100 animate-slide-up text-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-10">The Transformation</p>
                <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-tight mb-12">
                    You'll stop asking <br className="hidden md:block"/> <span className="text-gray-400 italic">"What should I do with my life?"</span> <br/>
                    and start asking <br className="hidden md:block"/> <span className="text-primary underline underline-offset-[12px] decoration-primary/20">"What did I learn from what I just did?"</span>
                </h3>
                <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium leading-relaxed italic">
                    This mindset shift is what separates people who build careers they love from people who stay perpetually stuck in research mode.
                </p>
            </section>
        </div>
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
        <div className="max-w-3xl mx-auto">
            <button 
                onClick={handleProceed}
                className="w-full py-6 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-full text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
                Start Phase 01: Secure My Path
            </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ClaritySprintDescription;
