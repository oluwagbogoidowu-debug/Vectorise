
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen w-full p-6 bg-primary text-white overflow-hidden relative selection:bg-white/10 items-center justify-center">
      <div className="flex flex-col h-full w-full justify-between relative z-10 max-w-sm">
        <div className="pt-10 text-center animate-fade-in flex-shrink-0">
          <LocalLogo type="white" className="h-8 w-auto mx-auto mb-2" />
        </div>

        <div className="flex-grow flex items-center justify-center animate-slide-up py-20">
          <h1 className="text-5xl font-black leading-[0.95] text-center tracking-tighter">
            Your rise<br/><span className="opacity-80 italic">starts here</span>
          </h1>
        </div>

        <div className="pb-8 space-y-8 flex-shrink-0">
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/onboarding/intro')}
              className="w-full py-4 bg-[#0FB881] text-primary font-black rounded-full text-base shadow-2xl transition-all active:scale-95 uppercase tracking-widest border-2 border-white/5"
            >
              START MY RISE
            </button>
            <Link to="/login" className="block w-full">
              <button className="w-full py-4 bg-white/10 backdrop-blur-md text-white font-black rounded-full text-base shadow-xl transition-all active:scale-95 uppercase tracking-widest border-2 border-white/10">
                CONTINUE MY RISE
              </button>
            </Link>
          </div>
          <p className="text-center text-[8px] px-6 leading-relaxed opacity-40 font-black uppercase tracking-[0.2em]">
            Join thousands achieving visible progress through focused sprints.
          </p>
        </div>
      </div>

      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px]"></div>

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex-shrink-0">
        <div className="w-20 h-1 bg-white/20 rounded-full"></div>
      </footer>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
