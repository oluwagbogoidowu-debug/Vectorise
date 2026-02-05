
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

const CoachQuizIntro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[100dvh] w-screen px-6 py-4 bg-primary text-white overflow-hidden relative">
      <div className="flex flex-col h-full w-full max-w-md mx-auto relative z-10">
        <header className="flex justify-center items-center w-full pt-6 pb-6 flex-shrink-0">
           <LocalLogo type="white" className="h-6 w-auto opacity-70" />
        </header>

        <div className="w-full bg-white/10 rounded-full h-1 mb-10 flex-shrink-0 overflow-hidden">
          <div className="bg-white h-1 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: '25%' }}></div>
        </div>

        <main className="flex-grow flex items-center justify-center animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-center px-4 leading-snug tracking-tight">
            Help us understand your coaching profile to tailor your registry dashboard experience.
          </h1>
        </main>

        <footer className="w-full pb-8 flex-shrink-0">
          <div className="flex items-center justify-between space-x-3 mb-8">
            <button 
              onClick={() => navigate('/onboarding/coach/welcome')}
              className="w-1/2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black py-3.5 px-6 rounded-full shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Back
            </button>
            <button 
              onClick={() => navigate('/onboarding/coach/quiz')}
              className="w-1/2 bg-white text-primary font-black py-3.5 px-6 rounded-full shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Start
            </button>
          </div>

          <div className="flex justify-center">
              <div className="w-20 h-1 bg-white/20 rounded-full"></div>
          </div>
        </footer>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CoachQuizIntro;
