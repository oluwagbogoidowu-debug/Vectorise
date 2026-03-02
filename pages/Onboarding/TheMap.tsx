import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

interface MapCardProps {
  children: React.ReactNode;
  bg?: string;
  className?: string;
}

const MapCard: React.FC<MapCardProps> = ({ children, bg = "bg-white", className = "" }) => (
  <div className={`snap-center flex-shrink-0 w-[85vw] md:w-[450px] h-[550px] ${bg} rounded-[3rem] p-10 flex flex-col border border-gray-100 shadow-xl relative overflow-hidden ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ text, color = "text-primary" }: { text: string; color?: string }) => (
  <p className={`text-[9px] font-black uppercase tracking-[0.4em] mb-4 ${color}`}>{text}</p>
);

const TheMap: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const goBackToPayment = () => navigate(-1);

  return (
    <div className="h-screen w-screen bg-[#FDFDFD] flex flex-col font-sans overflow-hidden">
      
      {/* Top Bar */}
      <header className="flex-shrink-0 px-8 py-6 flex justify-between items-center border-b border-gray-50 bg-white">
        <div className="flex items-center gap-4">
          <LocalLogo type="green" className="h-5 w-auto" />
          <div className="w-px h-4 bg-gray-100"></div>
          <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest italic">The Map</p>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-primary transition-all active:scale-90">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Main Map Slider */}
      <main 
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto snap-x snap-mandatory gap-6 px-8 md:px-[20vw] no-scrollbar scroll-smooth"
      >
        
        {/* Card 1 — What this is */}
        <MapCard>
            <SectionLabel text="01 Identity" />
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-8 italic">What <br/> this is.</h2>
            <div className="space-y-6 text-lg font-medium text-gray-500 leading-relaxed italic">
                <p>Vectorise is not content.</p>
                <p>It’s a progression system designed to move you from uncertainty to execution through focused sprints.</p>
                <p className="text-gray-900 font-black not-italic underline decoration-primary/10 underline-offset-8">You don’t do everything.</p>
                <p>You move through what you need.</p>
            </div>
            <div className="mt-auto flex justify-center">
                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-1/4"></div>
                </div>
            </div>
        </MapCard>

        {/* Card 2 — How progression works */}
        <MapCard>
            <SectionLabel text="02 Protocol" />
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-8 italic">How it <br/> works.</h2>
            <div className="space-y-8">
                {[
                    "Each sprint solves a specific problem.",
                    "Each stage prepares you for the next.",
                    "Skipping stages creates friction.",
                    "Following them creates momentum."
                ].map((text, i) => (
                    <div key={i} className="flex gap-5 items-start">
                        <span className="text-xl font-black text-gray-200 italic">0{i+1}</span>
                        <p className="text-lg font-bold text-gray-700 tracking-tight italic">"{text}"</p>
                    </div>
                ))}
            </div>
        </MapCard>

        {/* Card 3 — FOUNDATION */}
        <MapCard bg="bg-primary" className="text-white border-none">
            <SectionLabel text="03 Stage" color="text-white/40" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white">Foundation</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4">Clarity Sprint</h3>
            <p className="text-sm text-white/60 mb-10 font-bold uppercase tracking-widest">When things feel unclear</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium leading-relaxed italic">"From confusion to direction through action."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Career Transition', 'Business Start', 'Passion Search', 'Direction Loss'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-white/10">
                    <p className="text-[8px] font-black text-[#0FB881] uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black italic">You know what to focus on next.</p>
                </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        </MapCard>

        {/* Card 4 — DIRECTION */}
        <MapCard>
            <SectionLabel text="04 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Direction</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Mindset Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When the block is internal</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Remove resistance slowing your progress."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Self-Belief', 'Confidence Dip', 'Inner Resistance', 'Mental Block'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">You stop fighting yourself.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 5 — EXECUTION */}
        <MapCard>
            <SectionLabel text="05 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Execution</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Execution Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When you’re ready to act</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Turn intent into consistent action."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Project Launch', 'Skill Practice', 'Shipping Work', 'Daily Action'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">Something real gets done.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 6 — PROOF */}
        <MapCard>
            <SectionLabel text="06 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Proof</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Proof Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When effort needs evidence</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Convert action into visible results."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Validation', 'Credibility', 'Early Results', 'Confidence Boost'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">Your work starts to speak.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 7 — POSITIONING */}
        <MapCard>
            <SectionLabel text="07 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Positioning</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Positioning Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When value isn’t landing</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Make the right people notice your work."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Visibility', 'Communication', 'Signal Clarity', 'Alignment'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">Your effort reaches the right audience.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 8 — STABILITY */}
        <MapCard>
            <SectionLabel text="08 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Stability</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Stability Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When momentum feels fragile</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Build systems that prevent burnout."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Inconsistency', 'Energy Drain', 'Overload', 'Burnout Risk'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">Progress becomes sustainable.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 9 — EXPANSION */}
        <MapCard>
            <SectionLabel text="09 Stage" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-primary">Expansion</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-gray-900">Expansion Sprint</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">When it’s time to scale</p>
            
            <div className="space-y-8">
                <div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">Context</p>
                    <p className="text-base font-medium text-gray-600 leading-relaxed italic">"Increase impact without losing control."</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {['Scaling', 'Leverage', 'Reach', 'Long-term growth'].map(ex => (
                        <div key={ex} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-tight">{ex}</div>
                    ))}
                </div>
                <div className="pt-6 border-t border-gray-50">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Target Outcome</p>
                    <p className="text-sm font-black text-gray-900 italic">You grow with intention.</p>
                </div>
            </div>
        </MapCard>

        {/* Card 10 — Where to begin */}
        <MapCard>
            <SectionLabel text="10 Logic" />
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-10 italic">Where to <br/> begin?</h2>
            <div className="space-y-8 text-xl font-medium text-gray-500 leading-relaxed italic">
                <p>You don’t start everywhere.</p>
                <div className="p-8 bg-primary/5 border-l-4 border-primary rounded-r-2xl">
                    <p className="text-gray-900 font-black not-italic">"For most people, the system works best when you begin with clarity."</p>
                </div>
                <p>Without clarity, execution is just activity. We ensure you're acting on the right things first.</p>
            </div>
        </MapCard>

        {/* Final Card — Primary action */}
        <MapCard bg="bg-white" className="justify-center text-center">
            <div className="mb-12">
                <LocalLogo type="green" className="h-10 w-auto mx-auto mb-8" />
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic">Your next move.</h2>
            </div>
            
            <div className="space-y-4">
                <button 
                    onClick={goBackToPayment}
                    className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-xs rounded-full shadow-2xl active:scale-95 transition-all"
                >
                    Back to payment page
                </button>
            </div>

            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        </MapCard>

      </main>

      {/* Helper Footer */}
      <footer className="px-8 py-6 text-center bg-white border-t border-gray-50">
        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">Vectorise Map Protocol • Swipe to Navigate</p>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default TheMap;