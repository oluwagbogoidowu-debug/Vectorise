import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Ensuring everyone goes through the quiz flow to maintain data integrity
    navigate('/onboarding/welcome');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );
};

export default SignUpPage;