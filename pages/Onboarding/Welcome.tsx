
import React from 'react';
import { Link } from 'react-router-dom';
import whiteLogo from '../../assets/images/logo-white.png';

export const Welcome: React.FC = () => {
  return (
    <div className="flex flex-col h-screen p-6">
      <header className="flex justify-between items-center w-full px-4 pt-1">
        {/* Placeholder for status bar spacing if needed, or decorative header elements */}
        <div></div>
      </header>

      <main className="flex flex-col flex-grow justify-between">
        <div className="pt-16 text-center">
          <Link to="/"><img src={whiteLogo} alt="Vectorise Logo" className="h-16 w-auto object-contain mx-auto" /></Link>
        </div>

        <div className="flex-grow flex items-center justify-center -mt-16">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-center">
            Your rise<br/>starts here
          </h1>
        </div>

        <div className="pb-8">
          <div className="space-y-4">
            <Link to="/onboarding/intro" className="block w-full">
              <button className="w-full py-4 bg-[#0FB881] text-primary font-bold rounded-full text-lg shadow-md transition-transform active:scale-95">
                Start my rise
              </button>
            </Link>
            <Link to="/login" className="block w-full">
              <button className="w-full py-4 bg-white text-primary font-bold rounded-full text-lg shadow-md transition-transform active:scale-95">
                Continue my rise
              </button>
            </Link>
          </div>
          <p className="text-center text-xs mt-6 px-4 leading-relaxed opacity-90">
            By continuing you accept our{' '}
            <Link to="#" className="underline font-semibold hover:text-white/80">Privacy Policy</Link>,{' '}
            <Link to="#" className="underline font-semibold hover:text-white/80">Terms of Use</Link> and{' '}
            <Link to="#" className="underline font-semibold hover:text-white/80">Subscription Terms</Link>
          </p>
        </div>
      </main>

      <footer className="flex justify-center pb-2">
        <div className="w-36 h-1.5 bg-white/30 rounded-full"></div>
      </footer>
    </div>
  );
};
