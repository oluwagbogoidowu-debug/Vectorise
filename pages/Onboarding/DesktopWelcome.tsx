
import React from 'react';
import { Link } from 'react-router-dom';
import DesktopOnboardingLayout from '../../components/DesktopOnboardingLayout';

export const DesktopWelcome: React.FC = () => {
  return (
    <DesktopOnboardingLayout>
      <div className="space-y-4 mb-6 text-center">
        <h2 className="text-3xl font-bold text-dark">Welcome to Vectorise</h2>
        <p className="text-gray-600">
          Let's get you started on your growth journey.
        </p>
      </div>
      <div className="space-y-4 mb-6">
        <Link to="/onboarding/desktop-intro" className="block w-full">
          <button className="w-full py-4 bg-primary text-white font-bold rounded-full text-lg shadow-md transition-transform active:scale-95">
            Start my rise
          </button>
        </Link>
        <Link to="/login" className="block w-full">
          <button className="w-full py-4 bg-gray-200 text-primary font-bold rounded-full text-lg shadow-md transition-transform active:scale-95">
            Continue my rise
          </button>
        </Link>
      </div>
      <p className="text-center text-xs text-gray-500 px-4 leading-relaxed">
        By continuing you accept our{' '}
        <Link to="#" className="underline font-semibold hover:text-gray-700">Privacy Policy</Link>,{' '}
        <Link to="#" className="underline font-semibold hover:text-gray-700">Terms of Use</Link> and{' '}
        <Link to="#" className="underline font-semibold hover:text-gray-700">Subscription Terms</Link>
      </p>
    </DesktopOnboardingLayout>
  );
};
