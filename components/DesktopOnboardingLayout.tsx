
import React from 'react';
import { Link } from 'react-router-dom';
import whiteLogo from '../assets/images/logo-white.png';

interface DesktopOnboardingLayoutProps {
  children: React.ReactNode;
}

const DesktopOnboardingLayout: React.FC<DesktopOnboardingLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen">
      {/* Left side with logo and headline */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-primary text-white p-12">
        <div className="w-full max-w-md">
          <Link to="/">
            <img src={whiteLogo} alt="Vectorise Logo" className="h-16 w-auto object-contain mb-8" />
          </Link>
          <h1 className="text-6xl font-bold leading-tight">
            Your rise<br/>starts here
          </h1>
        </div>
      </div>

      {/* Right side with onboarding content */}
      <div className="w-1/2 flex flex-col justify-center items-center p-12 bg-white text-dark">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DesktopOnboardingLayout;
