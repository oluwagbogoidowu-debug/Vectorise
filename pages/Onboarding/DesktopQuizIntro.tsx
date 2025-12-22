
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DesktopOnboardingLayout from '../../components/DesktopOnboardingLayout';
import Button from '../../components/Button';

const DesktopQuizIntro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DesktopOnboardingLayout>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-dark mb-4">First, a few questions</h1>
        <p className="text-lg text-gray-600 mb-8">
          This will help us recommend the perfect growth sprints for you.
        </p>
        <div className="space-y-4">
            <Link to="/onboarding/desktop-quiz">
                <Button variant="primary" size="lg" className="w-full">Let's go</Button>
            </Link>
            <Button variant="ghost" size="lg" onClick={() => navigate(-1)} className="w-full">Back</Button>
        </div>
      </div>
    </DesktopOnboardingLayout>
  );
};

export default DesktopQuizIntro;
