
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
    <div className="flex flex-col h-screen w-screen bg-primary text-white overflow-hidden relative selection:bg-white/10 p-6">
      <main className="flex flex-col h-full w-full justify-center items-center relative z-10 max-w-[320px] mx-auto">
        <header className="mb-8 text-center animate-fade-in">
           <LocalLogo type="white" className="h-5 w-auto mx-auto mb-6 opacity-40" />
           <h1 className="text-lg md:text-xl font-black tracking-tight leading-tight italic">
             What’s your biggest <br/> focus right now?
           </h1>
        </header>

        <div className="w-full space-y-3 animate-slide-up">
          {FOCUS_OPTIONS.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              className="w-full group relative overflow-hidden bg-white/5 border border-white/10 py-4 px-6 rounded-2xl transition-all duration-500 hover:bg-white hover:border-white hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center"
            >
              <div className="relative z-10">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] group-hover:text-primary transition-colors leading-relaxed block">
                  {option}
                </span>
              </div>
              <div className="absolute inset-0 bg-white group-hover:opacity-100 opacity-0 transition-opacity"></div>
            </button>
          ))}
        </div>

        <footer className="mt-10 opacity-20">
            <p className="text-[6px] font-black uppercase tracking-[0.4em]">Vectorise • Growth Registry Flow</p>
        </footer>
      </main>

      {/* Decorative elements - scaled down for mobile */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-black/10 rounded-full blur-[80px] pointer-events-none"></div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default FocusSelector;
