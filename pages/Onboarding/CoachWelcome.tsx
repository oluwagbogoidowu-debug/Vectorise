
import React from 'react';
import { Link } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

export const CoachWelcome: React.FC = () => {
  return (
    <div className="flex flex-col h-screen p-6 bg-primary text-white overflow-hidden relative">
      <header className="flex justify-between items-center w-full px-4 pt-1 z-10">
        <div></div>
      </header>

      <main className="flex flex-col flex-grow justify-between relative z-10">
        <div className="pt-16 text-center animate-fade-in">
          <LocalLogo type="white" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-[10px] font-black text-white/60 tracking-wider">Coach Registry</p>
        </div>

        <div className="flex-grow flex items-center justify-center -mt-16 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight text-center tracking-tighter">
            Build your<br/><span className="opacity-80">legacy here</span>
          </h1>
        </div>

        <div className="pb-8 space-y-10">
          <div className="space-y-4">
            <Link to="/onboarding/coach/intro" className="block w-full">
              <button className="w-full py-5 bg-[#0FB881] text-primary font-black rounded-full text-xl shadow-2xl transition-all active:scale-95 uppercase tracking-widest border-2 border-white/10">
                start my application
              </button>
            </Link>
            <Link to="/login" className="block w-full">
              <button className="w-full py-5 bg-white/10 backdrop-blur-md text-white font-black rounded-full text-xl shadow-xl transition-all active:scale-95 uppercase tracking-widest border-2 border-white/20">
                coach login
              </button>
            </Link>
          </div>
          <p className="text-center text-[10px] px-8 leading-relaxed opacity-40 font-black">
            Join elite coaches delivering short, high-impact programs.
          </p>
        </div>
      </main>

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[120px]"></div>

      <footer className="flex justify-center pb-4 relative z-10">
        <div className="w-36 h-1.5 bg-white/20 rounded-full"></div>
      </footer>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
