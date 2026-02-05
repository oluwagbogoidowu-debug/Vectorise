
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/Button';

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email address';
  const targetEnrollmentId = location.state?.targetEnrollmentId;
  const isCoach = location.state?.isCoach;

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-green-50 text-primary rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        </div>
        
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Check your inbox</h2>
        
        <p className="text-gray-500 text-lg mb-8 leading-relaxed font-medium">
          We've sent a verification link to <br/>
          <span className="text-primary font-bold">{email}</span>
        </p>
        
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-10 text-sm text-gray-500 font-medium leading-relaxed italic">
            {isCoach ? (
                "Thank you for applying to the Vectorise Coach Registry! We've sent a verification link to your email. Once verified, our team will review your application and get back to you via this email regarding your approval status."
            ) : (
                "Please verify your email to secure your rise path. Once done, log in to jump straight into your program."
            )}
        </div>

        <Link to="/login" state={{ targetEnrollmentId }}>
            <Button className="w-full py-5 text-lg font-black uppercase tracking-widest rounded-full shadow-xl shadow-primary/20">
                Log In to Start
            </Button>
        </Link>
        
        <div className="mt-8">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Didn't get it? <Link to={isCoach ? "/onboarding/coach/welcome" : "/signup"} className="text-primary hover:underline ml-1">Restart Onboarding</Link>
            </p>
        </div>

        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
