import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { toast as alertToast } from 'sonner';

const VerifyEmailPage: React.FC = () => {
  const { user, mustVerifyEmail, loading, checkVerification, logout, deferVerification } = useAuth();
  const navigate = useNavigate();
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-10 h-10 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no user is logged in, redirect them to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If email is already verified and confirmed, redirect them to the dashboard
  if (!mustVerifyEmail) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResendOverlayMail = async () => {
    if (auth.currentUser) {
      setIsResendingLink(true);
      try {
        await sendEmailVerification(auth.currentUser);
        alertToast.success("Verification link resent to your email.");
      } catch (err) {
        alertToast.error("Failed to resend. Please try again in a moment.");
      } finally {
        setIsResendingLink(false);
      }
    }
  };

  const handleIHaveClickedLink = async () => {
    setVerifyingCode(true);
    try {
      const isVerified = await checkVerification();
      if (isVerified) {
        alertToast.success("Email verified successfully! Welcome.");
        navigate('/', { replace: true });
      } else {
        alertToast.error("We checked, but the link hasn't been verified in your inbox yet!");
      }
    } catch (err) {
      console.error(err);
      alertToast.error("Failed to check status.");
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden relative">
      {/* Subtle floating Cancel button at top-left of the viewport */}
      <button 
        type="button" 
        onClick={() => {
          setShowCancelConfirm(true);
        }}
        className="absolute top-6 left-6 flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-full shadow-sm text-xs font-black text-gray-500 uppercase tracking-widest transition-all active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel
      </button>

      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-8 sm:p-10 text-center animate-fade-in relative max-h-[90vh] overflow-y-auto">
        
        <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#0E7850]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight uppercase leading-none">Verify Your Email</h2>
        <p className="text-gray-500 text-xs mb-6 font-medium">
          We've sent a portal link to:<br/>
          <span className="text-primary font-black italic break-all">{user.email}</span>
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest text-center">
          Click the link and you will be automatically verified
          <span className="block mt-2 font-black text-amber-600">(You can also check your spam for the email if it hasn't arrived)</span>
        </div>

        <div className="space-y-3">
          <button 
            type="button"
            disabled={verifyingCode}
            onClick={handleIHaveClickedLink}
            className="w-full py-3.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {verifyingCode ? 'Checking verification...' : "I've clicked the link"}
          </button>

          <div className="flex justify-between gap-4 pt-4 mt-2 border-t border-gray-100">
            <button 
              type="button"
              disabled={isResendingLink}
              onClick={handleResendOverlayMail}
              className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline disabled:opacity-50"
            >
              {isResendingLink ? 'Sending Link...' : 'Resend Email'}
            </button>

            <button 
              type="button"
              onClick={async () => {
                await logout();
              }}
              className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal overlay */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center relative overflow-hidden border border-gray-100">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Are you sure?</h3>
            <p className="text-gray-500 font-medium mb-8 text-sm leading-relaxed">
              Canceling email verification may limit what you can do. Are you sure you want to continue?
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  deferVerification();
                  navigate('/', { replace: true });
                }}
                className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-colors shadow-lg active:scale-95 cursor-pointer"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;
