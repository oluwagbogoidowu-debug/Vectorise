
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/Button';

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email address';
  const targetEnrollmentId = location.state?.targetEnrollmentId;
  const isCoach = location.state?.isCoach;

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-50 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        </div>
        
        <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight leading-none">Registry Verification</h2>
        
        <p className="text-gray-500 text-sm mb-6 leading-relaxed font-medium">
          Sent to <br/>
          <span className="text-primary font-bold italic">{email}</span>
        </p>
        
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-8 text-[11px] text-gray-400 font-medium leading-relaxed italic">
            {isCoach ? (
                "Verification is required for registry review. We will contact you regarding status via this email."
            ) : (
                "Please verify your link to secure your path. You'll be ready to start immediately after login."
            )}
        </div>

        <Link to="/login" state={{ targetEnrollmentId }} className="w-full block">
            <Button className="w-full py-3.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/10 transition-transform active:scale-95">
                Ready to Log In
            </Button>
        </Link>
        
        <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">
                Nothing arrived? <Link to={isCoach ? "/onboarding/coach/welcome" : "/onboarding/welcome"} className="text-primary hover:underline ml-1">Restart</Link>
            </p>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;
