
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

const QuizIntro: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { targetSprintId, referrerId } = location.state || {};

  const handleNext = () => {
    navigate('/onboarding/quiz', { state: { targetSprintId, referrerId } });
  };

  return (
    <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white relative">
      <header className="flex justify-center items-center w-full pt-8 pb-10">
         <LocalLogo type="white" className="h-10 w-auto opacity-80" />
      </header>

      <div className="w-full bg-white/10 rounded-full h-1.5 mb-12">
        <div className="bg-white h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: '25%' }}></div>
      </div>

      <main className="flex-grow flex items-center justify-center">
        <h1 className="text-3xl md:text-4xl font-bold text-center px-4 leading-snug tracking-tight">
          {targetSprintId ? "You're almost there. Let's align your profile with this sprint for maximum impact." : "Take a short quiz to set up your rise path — quick, simple, and made for your goals."}
        </h1>
      </main>

      <footer className="w-full pb-8 flex-shrink-0">
        <div className="flex items-center justify-between space-x-4 mb-8">
          <button 
            onClick={() => navigate('/onboarding/welcome')}
            className="w-1/2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black py-4 px-6 rounded-full shadow-lg active:scale-95 transition-transform text-lg"
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            className="w-1/2 bg-white text-primary font-black py-4 px-6 rounded-full shadow-2xl active:scale-95 transition-transform text-lg"
          >
            Next
          </button>
        </div>

        <div className="flex justify-center">
            <div className="w-36 h-1.5 bg-white/20 rounded-full"></div>
        </div>
      </footer>
    </div>
  );
};

export default QuizIntro;
