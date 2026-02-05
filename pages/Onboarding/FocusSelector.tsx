
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

const FOCUS_OPTIONS = [
  "Get clarity on my career direction",
  "Build real-world skills before graduation",
  "Prepare for internships or entry roles",
  "Turn an interest into a real project",
  "Explore entrepreneurship seriously"
];

const FocusSelector: React.FC = () => {
  const navigate = useNavigate();

  const handleSelect = (option: string) => {
    // Navigate instantly on selection
    navigate('/onboarding/clarity-description', { state: { selectedFocus: option } });
  };

  return (
    <div className="flex flex-col h-screen w-screen p-8 bg-primary text-white overflow-hidden relative selection:bg-white/10">
      <main className="flex flex-col h-full w-full justify-center items-center relative z-10 max-w-sm mx-auto">
        <header className="mb-20 text-center animate-fade-in">
           <LocalLogo type="white" className="h-6 w-auto mx-auto mb-10 opacity-40" />
           <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight mb-3 italic">
             What’s your biggest focus right now?
           </h1>
           <p className="text-white/30 text-[8px] font-black uppercase tracking-[0.4em]">Strategic Alignment</p>
        </header>

        <div className="w-full space-y-4 animate-slide-up">
          {FOCUS_OPTIONS.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              className="w-full group relative overflow-hidden bg-white/5 border border-white/10 py-7 px-8 rounded-[1.25rem] transition-all duration-500 hover:bg-white hover:border-white hover:scale-[1.01] active:scale-95 text-left"
            >
              <div className="relative z-10 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-primary transition-colors leading-relaxed pr-4">
                  {option}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all -translate-x-2 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-white group-hover:opacity-100 opacity-0 transition-opacity"></div>
            </button>
          ))}
        </div>

        <footer className="mt-24 opacity-20">
            <p className="text-[7px] font-black uppercase tracking-[0.5em]">Vectorise • Growth Registry Flow</p>
        </footer>
      </main>

      {/* Decorative elements */}
      <div className="absolute top-[-15%] right-[-15%] w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-15%] w-96 h-96 bg-black/10 rounded-full blur-[120px] pointer-events-none"></div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default FocusSelector;
