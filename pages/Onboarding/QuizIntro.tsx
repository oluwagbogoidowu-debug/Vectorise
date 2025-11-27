
import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuizIntro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white">
      {/* Header / Status Bar Mock */}
      <header className="flex justify-between items-center w-full pt-1 pb-6">
         <div></div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-1.5 mb-8">
        <div className="bg-white h-1.5 rounded-full transition-all duration-1000" style={{ width: '25%' }}></div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <h1 className="text-3xl md:text-4xl font-bold text-center px-2 leading-normal">
          Take a short quiz to set up your rise Path - quick, simple, and made for your goals.
        </h1>
      </main>

      {/* Footer Actions */}
      <footer className="w-full pb-4 flex-shrink-0">
        <div className="flex items-center justify-between space-x-4 mb-6">
          <button 
            onClick={() => navigate('/onboarding/welcome')}
            className="w-1/2 bg-white text-primary font-bold py-4 px-6 rounded-full shadow-lg active:scale-95 transition-transform text-lg"
          >
            Previous
          </button>
          <button 
            onClick={() => navigate('/onboarding/quiz')}
            className="w-1/2 bg-white text-primary font-bold py-4 px-6 rounded-full shadow-lg active:scale-95 transition-transform text-lg"
          >
            Next
          </button>
        </div>

        {/* Home Indicator */}
        <div className="flex justify-center">
            <div className="w-36 h-1.5 bg-white/30 rounded-full"></div>
        </div>
      </footer>
    </div>
  );
};

export default QuizIntro;
